package grpc

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
)

const layout = "2006-01-02 15:04:05"

type TransactionHandler struct {
	dto.UnimplementedTransactionServiceServer

	transactionService *service.TransactionService
}

func (s *TransactionHandler) CreateTransaction(ctx context.Context, req *dto.CreateTransactionRequest) (*dto.CreateTransactionResponse, error) {
	var note string
	if req.Note != nil {
		note = *req.Note
	}

	var sender int
	if req.Sender != nil {
		sender = int(*req.Sender)
	}

	var receiver int
	if req.Receiver != nil {
		receiver = int(*req.Receiver)
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, err
	}

	newId, err := s.transactionService.CreateTransaction(ctx, int(req.Amount), int(req.Currency), sender, receiver, int(req.Category), date, note)
	if err != nil {
		return nil, err
	}

	return &dto.CreateTransactionResponse{
		Id: uint32(newId),
	}, nil
}

func (s *TransactionHandler) GetAllTransactions(ctx context.Context, _ *dto.GetAllTransactionsRequest) (*dto.GetAllTransactionsResponse, error) {
	transactions, err := s.transactionService.GetAllTransactions(ctx)
	fmt.Println(len(transactions))
	if err != nil {
		return nil, err
	}

	transactionsDto := make([]*dto.Transaction, len(transactions))
	for i, transaction := range transactions {
		var note *string
		if transaction.Note != "" {
			note = &transaction.Note
		}

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

		transactionsDto[i] = &dto.Transaction{
			Id:       uint32(transaction.ID),
			Amount:   uint32(transaction.Amount),
			Currency: uint32(transaction.Currency),
			Sender:   sender,
			Receiver: receiver,
			Category: uint32(transaction.Category),
			Date:     transaction.Date.Format(layout),
			Note:     note,
		}
	}

	return &dto.GetAllTransactionsResponse{
		Transactions: transactionsDto,
	}, nil
}
