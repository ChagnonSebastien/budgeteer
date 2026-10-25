package grpc

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type settlementRepository interface {
	GetUserSettlements(ctx context.Context, userEmail string) ([]model.Settlement, error)
	CreateSettlement(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		groupId model.TransactionGroupID,
		payer, receiver model.Email,
		fields model.SettlementFields,
		own model.Optional[model.PersonalTransactionFields],
	) (model.SettlementID, error)
	UpdateSettlement(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		id model.SettlementID,
		fields model.SettlementFields,
		own model.Optional[model.PersonalTransactionFields],
	) error
	ConfirmSettlement(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		id model.SettlementID,
		own model.Optional[model.PersonalTransactionFields],
	) error
	DeleteSettlement(ctx context.Context, userId uuid.UUID, userEmail string, id model.SettlementID) error
	RecordSettlementTransaction(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		id model.SettlementID,
		own model.PersonalTransactionFields,
	) error
}

type SettlementHandler struct {
	dto.UnimplementedSettlementServiceServer

	settlementService settlementRepository
}

func personalTransactionFieldsFromDto(fields *dto.PersonalTransactionFields) (model.PersonalTransactionFields, error) {
	date, err := time.Parse(layout, fields.Date)
	if err != nil {
		return model.PersonalTransactionFields{}, status.Error(codes.InvalidArgument, "invalid transaction date")
	}
	optional := func(value *uint32) model.Optional[int] {
		if value == nil {
			return model.None[int]()
		}
		return model.Some(int(*value))
	}
	return model.PersonalTransactionFields{
		Amount:             int(fields.Amount),
		ReceiverAmount:     int(fields.ReceiverAmount),
		CurrencyID:         int(fields.Currency),
		ReceiverCurrencyID: int(fields.ReceiverCurrency),
		SenderAccountID:    optional(fields.Sender),
		ReceiverAccountID:  optional(fields.Receiver),
		CategoryID:         optional(fields.Category),
		Date:               date,
		Note:               fields.Note,
	}, nil
}

func ownTransaction(user *shared.User, fields *dto.PersonalTransactionFields) (model.Optional[model.PersonalTransactionFields], error) {
	if fields == nil {
		return model.None[model.PersonalTransactionFields](), nil
	}
	if user.IsGuestUser() {
		return model.None[model.PersonalTransactionFields](), status.Error(codes.InvalidArgument, "guests don't record transactions")
	}
	parsed, err := personalTransactionFieldsFromDto(fields)
	if err != nil {
		return model.None[model.PersonalTransactionFields](), err
	}
	return model.Some(parsed), nil
}

func settlementFieldsFromDto(amount uint32, date, note string) (model.SettlementFields, error) {
	if amount == 0 {
		return model.SettlementFields{}, status.Error(codes.InvalidArgument, "a settlement needs an amount")
	}
	parsed, err := time.Parse(layout, date)
	if err != nil {
		return model.SettlementFields{}, status.Error(codes.InvalidArgument, "invalid settlement date")
	}
	return model.SettlementFields{Amount: int(amount), Date: parsed, Note: note}, nil
}

func (h *SettlementHandler) GetAllSettlements(ctx context.Context, _ *dto.GetAllSettlementsRequest) (*dto.GetAllSettlementsResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	settlements, err := h.settlementService.GetUserSettlements(ctx, user.Email)
	if err != nil {
		return nil, err
	}

	response := make([]*dto.Settlement, len(settlements))
	for i, s := range settlements {
		own := s.PayerTransaction
		if string(s.Receiver) == user.Email {
			own = s.ReceiverTransaction
		}
		var ownTransactionId *uint32
		if id, isSome := own.Value(); isSome {
			value := uint32(id)
			ownTransactionId = &value
		}
		response[i] = &dto.Settlement{
			Id:               uint32(s.ID),
			TransactionGroup: uint32(s.TransactionGroup),
			Amount:           uint32(s.Amount),
			Date:             s.Date.Format(layout),
			Note:             s.Note,
			Payer:            string(s.Payer),
			Receiver:         string(s.Receiver),
			CreatedBy:        string(s.CreatedBy),
			ProposedBy:       string(s.ProposedBy),
			Completed:        s.CompletedAt.IsSome(),
			OwnTransaction:   ownTransactionId,
		}
	}

	return &dto.GetAllSettlementsResponse{Settlements: response}, nil
}

func (h *SettlementHandler) CreateSettlement(ctx context.Context, req *dto.CreateSettlementRequest) (*dto.CreateSettlementResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}
	if req.Payer == req.Receiver {
		return nil, status.Error(codes.InvalidArgument, "a settlement needs two different people")
	}
	if req.Payer != user.Email && req.Receiver != user.Email {
		return nil, status.Error(codes.PermissionDenied, "you can only record a settlement you are part of")
	}
	fields, err := settlementFieldsFromDto(req.Amount, req.Date, req.Note)
	if err != nil {
		return nil, err
	}
	own, err := ownTransaction(user, req.OwnTransaction)
	if err != nil {
		return nil, err
	}

	id, err := h.settlementService.CreateSettlement(
		ctx, user.ID, user.Email, model.TransactionGroupID(req.TransactionGroup),
		model.Email(req.Payer), model.Email(req.Receiver), fields, own,
	)
	if err != nil {
		return nil, fmt.Errorf("creating settlement: %w", err)
	}
	return &dto.CreateSettlementResponse{Id: uint32(id)}, nil
}

func (h *SettlementHandler) UpdateSettlement(ctx context.Context, req *dto.UpdateSettlementRequest) (*dto.UpdateSettlementResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}
	fields, err := settlementFieldsFromDto(req.Amount, req.Date, req.Note)
	if err != nil {
		return nil, err
	}
	own, err := ownTransaction(user, req.OwnTransaction)
	if err != nil {
		return nil, err
	}

	if err := h.settlementService.UpdateSettlement(ctx, user.ID, user.Email, model.SettlementID(req.Id), fields, own); err != nil {
		return nil, fmt.Errorf("updating settlement: %w", err)
	}
	return &dto.UpdateSettlementResponse{}, nil
}

func (h *SettlementHandler) ConfirmSettlement(ctx context.Context, req *dto.ConfirmSettlementRequest) (*dto.ConfirmSettlementResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}
	own, err := ownTransaction(user, req.OwnTransaction)
	if err != nil {
		return nil, err
	}

	if err := h.settlementService.ConfirmSettlement(ctx, user.ID, user.Email, model.SettlementID(req.Id), own); err != nil {
		return nil, fmt.Errorf("confirming settlement: %w", err)
	}
	return &dto.ConfirmSettlementResponse{}, nil
}

func (h *SettlementHandler) DeleteSettlement(ctx context.Context, req *dto.DeleteSettlementRequest) (*dto.DeleteSettlementResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if err := h.settlementService.DeleteSettlement(ctx, user.ID, user.Email, model.SettlementID(req.Id)); err != nil {
		return nil, fmt.Errorf("deleting settlement: %w", err)
	}
	return &dto.DeleteSettlementResponse{}, nil
}

func (h *SettlementHandler) RecordSettlementTransaction(
	ctx context.Context,
	req *dto.RecordSettlementTransactionRequest,
) (*dto.RecordSettlementTransactionResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}
	if user.IsGuestUser() || req.OwnTransaction == nil {
		return nil, status.Error(codes.InvalidArgument, "record the settlement in your transactions")
	}
	own, err := personalTransactionFieldsFromDto(req.OwnTransaction)
	if err != nil {
		return nil, err
	}

	if err := h.settlementService.RecordSettlementTransaction(ctx, user.ID, user.Email, model.SettlementID(req.Id), own); err != nil {
		return nil, fmt.Errorf("recording settlement transaction: %w", err)
	}
	return &dto.RecordSettlementTransactionResponse{}, nil
}
