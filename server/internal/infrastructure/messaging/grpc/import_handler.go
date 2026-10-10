package grpc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	maxImportRowsPerBatch    = 1000
	maxFingerprintLength     = 128
	maxStatementNameLength   = 200
	maxImportFileNameLength  = 255
	maxImportProfileByteSize = 16 * 1024
	maxFingerprintLookups    = 20000
)

type importRepository interface {
	StartImport(ctx context.Context, userId uuid.UUID, account model.AccountID, fileName string) (model.ImportID, error)
	GetAllImports(ctx context.Context, userId uuid.UUID) ([]model.Import, error)
	DeleteImport(ctx context.Context, userId uuid.UUID, id model.ImportID) (repository.DeleteImportResult, error)
	GetAllImportProfiles(ctx context.Context, userId uuid.UUID) ([]model.ImportProfile, error)
	SaveImportProfile(ctx context.Context, userId uuid.UUID, profile model.ImportProfile) error
	GetKnownFingerprints(ctx context.Context, userId uuid.UUID, account model.AccountID, fingerprints []string) (map[string]model.TransactionID, error)
}

func importErrorToStatus(err error) error {
	switch {
	case errors.Is(err, repository.ErrImportNotFound), errors.Is(err, repository.ErrMergeTargetNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, repository.ErrImportAccountNotOwn),
		errors.Is(err, repository.ErrImportRowOutsideImport),
		errors.Is(err, repository.ErrMergeTargetMismatch),
		errors.Is(err, repository.ErrForeignReference):
		return status.Error(codes.FailedPrecondition, err.Error())
	default:
		return err
	}
}

func (s *TransactionHandler) BatchCreateTransactions(
	ctx context.Context,
	req *dto.BatchCreateTransactionsRequest,
) (*dto.BatchCreateTransactionsResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if len(req.Rows) > maxImportRowsPerBatch {
		return nil, status.Errorf(codes.InvalidArgument, "at most %d rows per batch", maxImportRowsPerBatch)
	}

	rows := make([]repository.ImportRow, len(req.Rows))
	for i, row := range req.Rows {
		if row.Transaction == nil || row.Transaction.TransactionGroupData != nil {
			return nil, status.Error(codes.InvalidArgument, "imported rows need a transaction outside any transaction group")
		}
		if row.Fingerprint == "" || len(row.Fingerprint) > maxFingerprintLength {
			return nil, status.Error(codes.InvalidArgument, "invalid row fingerprint")
		}
		if len(row.StatementName) > maxStatementNameLength {
			return nil, status.Error(codes.InvalidArgument, "statement name too long")
		}

		transaction, err := newTransactionFromDto(row.Transaction)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid transaction in imported row")
		}

		mergeInto := model.None[model.TransactionID]()
		if row.MergeInto != nil {
			mergeInto = model.Some(model.TransactionID(*row.MergeInto))
		}

		rows[i] = repository.ImportRow{
			Transaction:   transaction,
			Fingerprint:   row.Fingerprint,
			StatementName: row.StatementName,
			MergeInto:     mergeInto,
		}
	}

	result, err := s.transactionService.BatchCreateTransactions(ctx, user.ID, user.Email, model.ImportID(req.ImportId), rows)
	if err != nil {
		return nil, importErrorToStatus(err)
	}

	results := make([]*dto.ImportRowResult, len(result.Rows))
	for i, row := range result.Rows {
		outcome := dto.ImportRowOutcome_ImportRowCreated
		switch row.Outcome {
		case repository.ImportRowMerged:
			outcome = dto.ImportRowOutcome_ImportRowMerged
		case repository.ImportRowSkipped:
			outcome = dto.ImportRowOutcome_ImportRowSkipped
		}
		results[i] = &dto.ImportRowResult{Outcome: outcome, TransactionId: uint32(row.TransactionID)}
	}

	accounts := make([]*dto.AccountStatementNames, 0, len(result.StatementNames))
	for account, names := range result.StatementNames {
		accounts = append(accounts, &dto.AccountStatementNames{Account: uint32(account), StatementNames: names})
	}

	return &dto.BatchCreateTransactionsResponse{Results: results, Accounts: accounts}, nil
}

type ImportHandler struct {
	dto.UnimplementedImportServiceServer

	importService importRepository
}

func (s *ImportHandler) StartImport(ctx context.Context, req *dto.StartImportRequest) (*dto.StartImportResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if len(req.FileName) > maxImportFileNameLength {
		return nil, status.Error(codes.InvalidArgument, "file name too long")
	}

	id, err := s.importService.StartImport(ctx, user.ID, model.AccountID(req.Account), req.FileName)
	if err != nil {
		return nil, importErrorToStatus(err)
	}

	return &dto.StartImportResponse{Id: uint32(id)}, nil
}

func (s *ImportHandler) GetAllImports(ctx context.Context, _ *dto.GetAllImportsRequest) (*dto.GetAllImportsResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	imports, err := s.importService.GetAllImports(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	importsDto := make([]*dto.Import, len(imports))
	for i, imp := range imports {
		importsDto[i] = &dto.Import{
			Id:        uint32(imp.ID),
			Account:   uint32(imp.Account),
			FileName:  imp.FileName,
			RowCount:  uint32(imp.RowCount),
			CreatedAt: imp.CreatedAt.Format(time.RFC3339),
		}
	}

	return &dto.GetAllImportsResponse{Imports: importsDto}, nil
}

func (s *ImportHandler) DeleteImport(ctx context.Context, req *dto.DeleteImportRequest) (*dto.DeleteImportResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	result, err := s.importService.DeleteImport(ctx, user.ID, model.ImportID(req.Id))
	if err != nil {
		return nil, importErrorToStatus(err)
	}

	return &dto.DeleteImportResponse{
		DeletedTransactions:  uint32(result.Deleted),
		RevertedTransactions: uint32(result.Reverted),
	}, nil
}

func (s *ImportHandler) GetAllImportProfiles(
	ctx context.Context,
	_ *dto.GetAllImportProfilesRequest,
) (*dto.GetAllImportProfilesResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	profiles, err := s.importService.GetAllImportProfiles(ctx, user.ID)
	if err != nil {
		return nil, err
	}

	profilesDto := make([]*dto.ImportProfile, len(profiles))
	for i, profile := range profiles {
		profilesDto[i] = &dto.ImportProfile{Account: uint32(profile.Account), Mapping: string(profile.Mapping)}
	}

	return &dto.GetAllImportProfilesResponse{Profiles: profilesDto}, nil
}

func (s *ImportHandler) SaveImportProfile(
	ctx context.Context,
	req *dto.SaveImportProfileRequest,
) (*dto.SaveImportProfileResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if req.Profile == nil || len(req.Profile.Mapping) > maxImportProfileByteSize || !json.Valid([]byte(req.Profile.Mapping)) {
		return nil, status.Error(codes.InvalidArgument, "invalid import profile mapping")
	}

	err := s.importService.SaveImportProfile(ctx, user.ID, model.ImportProfile{
		Account: model.AccountID(req.Profile.Account),
		Mapping: json.RawMessage(req.Profile.Mapping),
	})
	if err != nil {
		return nil, importErrorToStatus(err)
	}

	return &dto.SaveImportProfileResponse{}, nil
}

func (s *ImportHandler) GetKnownFingerprints(
	ctx context.Context,
	req *dto.GetKnownFingerprintsRequest,
) (*dto.GetKnownFingerprintsResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if len(req.Fingerprints) > maxFingerprintLookups {
		return nil, status.Errorf(codes.InvalidArgument, "at most %d fingerprints per lookup", maxFingerprintLookups)
	}

	known, err := s.importService.GetKnownFingerprints(ctx, user.ID, model.AccountID(req.Account), req.Fingerprints)
	if err != nil {
		return nil, err
	}

	knownDto := make([]*dto.KnownFingerprint, 0, len(known))
	for fingerprint, transactionId := range known {
		knownDto = append(knownDto, &dto.KnownFingerprint{Fingerprint: fingerprint, TransactionId: uint32(transactionId)})
	}

	return &dto.GetKnownFingerprintsResponse{Fingerprints: knownDto}, nil
}
