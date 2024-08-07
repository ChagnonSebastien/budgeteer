package grpc

import (
	"context"

	"chagnon.dev/budget-server/internal/domain/service"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type TransactionHandler struct {
	dto.UnimplementedTransactionServiceServer

	transactionService *service.TransactionService
}

func (s *TransactionHandler) CreateTransaction(ctx context.Context, req *dto.CreateTransactionRequest) (*dto.CreateTransactionResponse, error) {
	note := ""
	if req.Note != nil {
		note = *req.Note
	}

	newId, err := s.transactionService.CreateTransaction(ctx, int(req.Amount), int(req.Currency), int(req.Sender), int(req.Receiver), int(req.Category), req.Date.AsTime(), note)
	if err != nil {
		return nil, err
	}

	return &dto.CreateTransactionResponse{
		Id: int32(newId),
	}, nil
}

func (s *TransactionHandler) GetAllTransactions(ctx context.Context, req *dto.GetAllTransactionsRequest) (*dto.GetAllTransactionsResponse, error) {
	transactions, err := s.transactionService.GetAllTransactions(ctx)
	if err != nil {
		return nil, err
	}

	transactionsDto := make([]*dto.Transaction, len(transactions))
	for _, transaction := range transactions {
		var note *string
		if transaction.Note != "" {
			note = &transaction.Note
		}

		transactionsDto = append(transactionsDto, &dto.Transaction{
			Id:       int32(transaction.ID),
			Amount:   int32(transaction.Amount),
			Currency: int32(transaction.Currency),
			Sender:   int32(transaction.Sender),
			Receiver: int32(transaction.Receiver),
			Category: int32(transaction.Category),
			Date:     timestamppb.New(transaction.Date),
			Note:     note,
		})
	}

	return &dto.GetAllTransactionsResponse{
		Transactions: transactionsDto,
	}, nil
}
