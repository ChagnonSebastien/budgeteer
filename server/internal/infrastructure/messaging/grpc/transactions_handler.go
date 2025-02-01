package grpc

import (
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

const layout = "2006-01-02 15:04:05"

type TransactionHandler struct {
	dto.UnimplementedTransactionServiceServer

	transactionService *service.TransactionService
}

func (s *TransactionHandler) CreateTransaction(
	ctx context.Context,
	req *dto.CreateTransactionRequest,
) (*dto.CreateTransactionResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	var sender int
	if req.Sender != nil {
		sender = int(*req.Sender)
	}

	var receiver int
	if req.Receiver != nil {
		receiver = int(*req.Receiver)
	}

	var category int
	if req.Category != nil {
		category = int(*req.Category)
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, err
	}

	newId, err := s.transactionService.CreateTransaction(
		ctx,
		claims.Sub,
		int(req.Amount),
		int(req.Currency),
		sender,
		receiver,
		category,
		date,
		req.Note,
		int(req.ReceiverCurrency),
		int(req.ReceiverAmount),
	)
	if err != nil {
		return nil, err
	}

	return &dto.CreateTransactionResponse{
		Id: uint32(newId),
	}, nil
}

func (s *TransactionHandler) UpdateTransaction(
	ctx context.Context,
	req *dto.UpdateTransactionRequest,
) (*dto.UpdateTransactionResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	var sender *int
	if req.Fields.UpdateSender {
		if req.Fields.Sender != nil {
			id := int(*req.Fields.Sender)
			sender = &id
		} else {
			id := 0
			sender = &id
		}
	}

	var receiver *int
	if req.Fields.UpdateReceiver {
		if req.Fields.Receiver != nil {
			id := int(*req.Fields.Receiver)
			sender = &id
		} else {
			id := 0
			sender = &id
		}
	}

	var category *int
	if req.Fields.UpdateCategory {
		if req.Fields.Category != nil {
			id := int(*req.Fields.Category)
			sender = &id
		} else {
			id := 0
			sender = &id
		}
	}

	var amount *int
	if req.Fields.Amount != nil {
		value := int(*req.Fields.Amount)
		amount = &value
	}

	var currencyId *int
	if req.Fields.Currency != nil {
		id := int(*req.Fields.Currency)
		currencyId = &id
	}

	var receiverAmount *int
	if req.Fields.ReceiverAmount != nil {
		value := int(*req.Fields.ReceiverAmount)
		receiverAmount = &value
	}

	var receiverCurrencyId *int
	if req.Fields.ReceiverCurrency != nil {
		id := int(*req.Fields.ReceiverCurrency)
		receiverCurrencyId = &id
	}

	var date *time.Time
	if req.Fields.Date != nil {
		computedDate, err := time.Parse(layout, *req.Fields.Date)
		if err != nil {
			return nil, err
		}
		date = &computedDate
	}

	err := s.transactionService.UpdateTransaction(
		ctx,
		claims.Sub,
		int(req.Id),
		repository.UpdateTransactionFields{
			Amount:             amount,
			CurrencyId:         currencyId,
			SenderAccountId:    sender,
			ReceiverAccountId:  receiver,
			CategoryId:         category,
			Date:               date,
			Note:               req.Fields.Note,
			ReceiverCurrencyId: receiverCurrencyId,
			ReceiverAmount:     receiverAmount,
		},
	)
	if err != nil {
		return nil, err
	}

	return &dto.UpdateTransactionResponse{}, nil
}

func (s *TransactionHandler) GetAllTransactions(
	ctx context.Context,
	_ *dto.GetAllTransactionsRequest,
) (*dto.GetAllTransactionsResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	transactions, err := s.transactionService.GetAllTransactions(ctx, claims.Sub)
	if err != nil {
		return nil, err
	}

	transactionsDto := make([]*dto.Transaction, len(transactions))
	for i, transaction := range transactions {
		var sender *uint32
		if transaction.Sender != 0 {
			id := uint32(transaction.Sender)
			sender = &id
		}

		var receiver *uint32
		if transaction.Receiver != 0 {
			id := uint32(transaction.Receiver)
			receiver = &id
		}

		var category *uint32
		if transaction.Category != 0 {
			id := uint32(transaction.Category)
			category = &id
		}

		transactionsDto[i] = &dto.Transaction{
			Id:               uint32(transaction.ID),
			Amount:           uint32(transaction.Amount),
			Currency:         uint32(transaction.Currency),
			Sender:           sender,
			Receiver:         receiver,
			Category:         category,
			Date:             transaction.Date.Format(layout),
			Note:             transaction.Note,
			ReceiverCurrency: uint32(transaction.ReceiverCurrency),
			ReceiverAmount:   uint32(transaction.ReceiverAmount),
		}
	}

	return &dto.GetAllTransactionsResponse{
		Transactions: transactionsDto,
	}, nil
}
