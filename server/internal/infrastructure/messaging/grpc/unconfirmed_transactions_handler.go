package grpc

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"github.com/google/uuid"
)

type unconfirmedTransactionRepository interface {
	GetUnconfirmedTransactions(ctx context.Context, userEmail string) ([]model.UnconfirmedTransaction, error)
	CreateUnconfirmedTransaction(
		ctx context.Context,
		userEmail string,
		transactionGroupId model.TransactionGroupID,
		ownerEmail string,
		amount int,
		date time.Time,
		note string,
		splitOverride model.Optional[model.SplitOverride],
	) (model.UnconfirmedTransactionID, error)
	UpdateUnconfirmedTransaction(
		ctx context.Context,
		userEmail string,
		id model.UnconfirmedTransactionID,
		fields repository.UpdateUnconfirmedTransactionFields,
	) error
	DeleteUnconfirmedTransaction(ctx context.Context, userEmail string, id model.UnconfirmedTransactionID) error
	PromoteUnconfirmedTransaction(
		ctx context.Context,
		userId uuid.UUID,
		userEmail string,
		id model.UnconfirmedTransactionID,
		amount, receiverAmount int,
		currencyId, receiverCurrencyId int,
		senderAccountId, receiverAccountId model.Optional[int],
		categoryId model.Optional[int],
		date time.Time,
		note string,
	) (model.TransactionID, error)
}

type UnconfirmedTransactionHandler struct {
	dto.UnimplementedUnconfirmedTransactionServiceServer

	unconfirmedTransactionService unconfirmedTransactionRepository
}

func splitOverrideFromDto(splitOverrideDto *dto.SplitOverride) (model.Optional[model.SplitOverride], error) {
	if splitOverrideDto == nil {
		return model.None[model.SplitOverride](), nil
	}

	splitTypeOverride, err := SplitTypeOverrideFromDto(splitOverrideDto.SplitTypeOverride)
	if err != nil {
		return model.None[model.SplitOverride](), err
	}

	members := make([]model.MemberSplitValue, len(splitOverrideDto.MemberSplitValues))
	for i, member := range splitOverrideDto.MemberSplitValues {
		splitValue := model.None[int]()
		if member.SplitValue != nil {
			splitValue = model.Some(int(*member.SplitValue))
		}

		members[i] = model.MemberSplitValue{
			Email:      model.Email(member.Email),
			SplitValue: splitValue,
		}
	}

	return model.Some(model.SplitOverride{
		SplitTypeOverride: splitTypeOverride,
		Members:           members,
	}), nil
}

func splitOverrideToDto(splitOverride model.Optional[model.SplitOverride]) (*dto.SplitOverride, error) {
	splitOverrideData, isSome := splitOverride.Value()
	if !isSome {
		return nil, nil
	}

	splitTypeOverride, err := SplitTypeOverrideToDto(splitOverrideData.SplitTypeOverride)
	if err != nil {
		return nil, err
	}

	members := make([]*dto.MemberSplitValue, len(splitOverrideData.Members))
	for i, member := range splitOverrideData.Members {
		var splitValue *uint32
		if value, isSome := member.SplitValue.Value(); isSome {
			v := uint32(value)
			splitValue = &v
		}

		members[i] = &dto.MemberSplitValue{
			Email:      string(member.Email),
			SplitValue: splitValue,
		}
	}

	return &dto.SplitOverride{
		SplitTypeOverride: splitTypeOverride,
		MemberSplitValues: members,
	}, nil
}

func (h *UnconfirmedTransactionHandler) GetAllUnconfirmedTransactions(
	ctx context.Context,
	_ *dto.GetAllUnconfirmedTransactionsRequest,
) (*dto.GetAllUnconfirmedTransactionsResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	unconfirmedTransactions, err := h.unconfirmedTransactionService.GetUnconfirmedTransactions(ctx, user.Email)
	if err != nil {
		return nil, err
	}

	unconfirmedTransactionsDto := make([]*dto.UnconfirmedTransaction, len(unconfirmedTransactions))
	for i, unconfirmedTransaction := range unconfirmedTransactions {
		splitOverride, err := splitOverrideToDto(unconfirmedTransaction.SplitOverride)
		if err != nil {
			return nil, err
		}

		unconfirmedTransactionsDto[i] = &dto.UnconfirmedTransaction{
			Id:               uint32(unconfirmedTransaction.ID),
			TransactionGroup: uint32(unconfirmedTransaction.TransactionGroup),
			Owner:            string(unconfirmedTransaction.Owner),
			CreatedBy:        string(unconfirmedTransaction.CreatedBy),
			Amount:           uint32(unconfirmedTransaction.Amount),
			Date:             unconfirmedTransaction.Date.Format(layout),
			Note:             unconfirmedTransaction.Note,
			SplitOverride:    splitOverride,
		}
	}

	return &dto.GetAllUnconfirmedTransactionsResponse{UnconfirmedTransactions: unconfirmedTransactionsDto}, nil
}

func (h *UnconfirmedTransactionHandler) CreateUnconfirmedTransaction(
	ctx context.Context,
	req *dto.CreateUnconfirmedTransactionRequest,
) (*dto.CreateUnconfirmedTransactionResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, err
	}

	splitOverride, err := splitOverrideFromDto(req.SplitOverride)
	if err != nil {
		return nil, err
	}

	id, err := h.unconfirmedTransactionService.CreateUnconfirmedTransaction(
		ctx,
		user.Email,
		model.TransactionGroupID(req.TransactionGroup),
		req.Owner,
		int(req.Amount),
		date,
		req.Note,
		splitOverride,
	)
	if err != nil {
		return nil, err
	}

	return &dto.CreateUnconfirmedTransactionResponse{Id: uint32(id)}, nil
}

func (h *UnconfirmedTransactionHandler) UpdateUnconfirmedTransaction(
	ctx context.Context,
	req *dto.UpdateUnconfirmedTransactionRequest,
) (*dto.UpdateUnconfirmedTransactionResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	fields := repository.UpdateUnconfirmedTransactionFields{
		Owner:         model.None[string](),
		Amount:        model.None[int](),
		Date:          model.None[time.Time](),
		Note:          model.None[string](),
		SplitOverride: model.None[model.Optional[model.SplitOverride]](),
	}

	if req.Fields != nil {
		if req.Fields.Owner != nil {
			fields.Owner = model.Some(*req.Fields.Owner)
		}
		if req.Fields.Amount != nil {
			fields.Amount = model.Some(int(*req.Fields.Amount))
		}
		if req.Fields.Date != nil {
			date, err := time.Parse(layout, *req.Fields.Date)
			if err != nil {
				return nil, err
			}
			fields.Date = model.Some(date)
		}
		if req.Fields.Note != nil {
			fields.Note = model.Some(*req.Fields.Note)
		}
		if req.Fields.UpdateSplitOverride {
			splitOverride, err := splitOverrideFromDto(req.Fields.SplitOverride)
			if err != nil {
				return nil, err
			}
			fields.SplitOverride = model.Some(splitOverride)
		}
	}

	err := h.unconfirmedTransactionService.UpdateUnconfirmedTransaction(ctx, user.Email, model.UnconfirmedTransactionID(req.Id), fields)
	if err != nil {
		return nil, err
	}

	return &dto.UpdateUnconfirmedTransactionResponse{}, nil
}

func (h *UnconfirmedTransactionHandler) DeleteUnconfirmedTransaction(
	ctx context.Context,
	req *dto.DeleteUnconfirmedTransactionRequest,
) (*dto.DeleteUnconfirmedTransactionResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	err := h.unconfirmedTransactionService.DeleteUnconfirmedTransaction(ctx, user.Email, model.UnconfirmedTransactionID(req.Id))
	if err != nil {
		return nil, err
	}

	return &dto.DeleteUnconfirmedTransactionResponse{}, nil
}

func (h *UnconfirmedTransactionHandler) PromoteUnconfirmedTransaction(
	ctx context.Context,
	req *dto.PromoteUnconfirmedTransactionRequest,
) (*dto.PromoteUnconfirmedTransactionResponse, error) {
	user, ok := shared.FromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("getting user from context")
	}

	if user.IsGuestUser() {
		return nil, fmt.Errorf("promoting unconfirmed transactions is not available to guest users")
	}

	sender := model.None[int]()
	if req.Sender != nil {
		sender = model.Some(int(*req.Sender))
	}

	receiver := model.None[int]()
	if req.Receiver != nil {
		receiver = model.Some(int(*req.Receiver))
	}

	category := model.None[int]()
	if req.Category != nil {
		category = model.Some(int(*req.Category))
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, err
	}

	transactionId, err := h.unconfirmedTransactionService.PromoteUnconfirmedTransaction(
		ctx,
		user.ID,
		user.Email,
		model.UnconfirmedTransactionID(req.Id),
		int(req.Amount), int(req.ReceiverAmount),
		int(req.Currency), int(req.ReceiverCurrency),
		sender, receiver,
		category,
		date,
		req.Note,
	)
	if err != nil {
		return nil, err
	}

	return &dto.PromoteUnconfirmedTransactionResponse{TransactionId: uint32(transactionId)}, nil
}
