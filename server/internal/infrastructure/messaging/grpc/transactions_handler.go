package grpc

import (
	"context"
	"fmt"
	"time"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/db/repository"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
)

const layout = "2006-01-02 15:04:05"

type transactionRepository interface {
	GetAllTransactions(ctx context.Context, userId string) ([]model.Transaction, error)
	CreateTransaction(
		ctx context.Context, userId string,
		amount, receiverAmount int,
		currencyId, receiverCurrencyId int,
		senderAccountId, receiverAccountId model.Optional[int],
		categoryId model.Optional[int],
		date time.Time,
		note string,
		financialIncomeData model.Optional[repository.CreateFinancialIncomeAdditionalData],
	) (model.TransactionID, error)
	UpdateTransaction(
		ctx context.Context,
		userId string,
		id model.TransactionID,
		fields repository.UpdateTransactionFields,
	) error
}

type TransactionHandler struct {
	dto.UnimplementedTransactionServiceServer

	transactionService transactionRepository
}

func (s *TransactionHandler) CreateTransaction(
	ctx context.Context,
	req *dto.CreateTransactionRequest,
) (*dto.CreateTransactionResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
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

	financialIncomeData := model.None[repository.CreateFinancialIncomeAdditionalData]()
	if req.FinancialIncomeData != nil {
		financialIncomeData = model.Some(repository.CreateFinancialIncomeAdditionalData{
			RelatedCurrencyId: int(req.FinancialIncomeData.RelatedCurrency),
		})
	}

	date, err := time.Parse(layout, req.Date)
	if err != nil {
		return nil, err
	}

	newId, err := s.transactionService.CreateTransaction(
		ctx,
		claims.Sub,
		int(req.Amount),
		int(req.ReceiverAmount),
		int(req.Currency),
		int(req.ReceiverCurrency),
		sender,
		receiver,
		category,
		date,
		req.Note,
		financialIncomeData,
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

	receiver := model.None[model.Optional[int]]()
	if req.Fields.UpdateReceiver {
		newValue := model.None[int]()
		if req.Fields.Receiver != nil {
			newValue = model.Some(int(*req.Fields.Receiver))
		}

		receiver = model.Some(newValue)
	}

	sender := model.None[model.Optional[int]]()
	if req.Fields.UpdateSender {
		newValue := model.None[int]()
		if req.Fields.Sender != nil {
			newValue = model.Some(int(*req.Fields.Sender))
		}

		sender = model.Some(newValue)
	}

	category := model.None[model.Optional[int]]()
	if req.Fields.UpdateCategory {
		newValue := model.None[int]()
		if req.Fields.Category != nil {
			newValue = model.Some(int(*req.Fields.Category))
		}

		category = model.Some(newValue)
	}

	updateFinancialIncomeAdditionalData := model.None[model.Optional[repository.UpdateFinancialIncomeAdditionalData]]()
	if req.Fields.UpdateFinancialIncome {
		fields := model.None[repository.UpdateFinancialIncomeAdditionalData]()
		if req.Fields.UpdateFinancialIncomeFields != nil {
			relatedCurrency := model.None[int]()
			if req.Fields.UpdateFinancialIncomeFields.RelatedCurrency != nil {
				relatedCurrency = model.Some(int(*req.Fields.UpdateFinancialIncomeFields.RelatedCurrency))
			}

			fields = model.Some(repository.UpdateFinancialIncomeAdditionalData{
				RelatedCurrencyId: relatedCurrency,
			})
		}

		updateFinancialIncomeAdditionalData = model.Some(fields)
	}

	amount := model.None[int]()
	if req.Fields.Amount != nil {
		amount = model.Some(int(*req.Fields.Amount))
	}

	receiverAmount := model.None[int]()
	if req.Fields.ReceiverAmount != nil {
		receiverAmount = model.Some(int(*req.Fields.ReceiverAmount))
	}

	currencyId := model.None[int]()
	if req.Fields.Currency != nil {
		currencyId = model.Some(int(*req.Fields.Currency))
	}

	receiverCurrencyId := model.None[int]()
	if req.Fields.ReceiverCurrency != nil {
		receiverCurrencyId = model.Some(int(*req.Fields.ReceiverCurrency))
	}

	date := model.None[time.Time]()
	if req.Fields.Date != nil {
		computedDate, err := time.Parse(layout, *req.Fields.Date)
		if err != nil {
			return nil, err
		}
		date = model.Some(computedDate)
	}

	note := model.None[string]()
	if req.Fields.Note != nil {
		note = model.Some(*req.Fields.Note)
	}

	err := s.transactionService.UpdateTransaction(
		ctx,
		claims.Sub,
		model.TransactionID(req.Id),
		repository.UpdateTransactionFields{
			Amount:                              amount,
			CurrencyId:                          currencyId,
			SenderAccountId:                     sender,
			ReceiverAccountId:                   receiver,
			CategoryId:                          category,
			Date:                                date,
			Note:                                note,
			ReceiverCurrencyId:                  receiverCurrencyId,
			ReceiverAmount:                      receiverAmount,
			UpdateFinancialIncomeAdditionalData: updateFinancialIncomeAdditionalData,
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
		if value, isSome := transaction.Sender.Value(); isSome {
			id := uint32(value)
			sender = &id
		}

		var receiver *uint32
		if value, isSome := transaction.Receiver.Value(); isSome {
			id := uint32(value)
			receiver = &id
		}

		var category *uint32
		if value, isSome := transaction.Category.Value(); isSome {
			id := uint32(value)
			category = &id
		}

		var financialIncomeData *dto.FinancialIncomeData
		if data, isSome := transaction.FinancialIncomeData.Value(); isSome {
			financialIncomeData = &dto.FinancialIncomeData{
				RelatedCurrency: uint32(data.RelatedCurrency),
			}
		}

		transactionsDto[i] = &dto.Transaction{
			Id:                  uint32(transaction.ID),
			Amount:              uint32(transaction.Amount),
			Currency:            uint32(transaction.Currency),
			Sender:              sender,
			Receiver:            receiver,
			Category:            category,
			Date:                transaction.Date.Format(layout),
			Note:                transaction.Note,
			ReceiverCurrency:    uint32(transaction.ReceiverCurrency),
			ReceiverAmount:      uint32(transaction.ReceiverAmount),
			FinancialIncomeData: financialIncomeData,
		}
	}

	return &dto.GetAllTransactionsResponse{
		Transactions: transactionsDto,
	}, nil
}
