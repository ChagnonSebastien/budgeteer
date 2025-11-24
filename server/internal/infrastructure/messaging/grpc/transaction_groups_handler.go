package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
	"chagnon.dev/budget-server/internal/logging"
)

type transactionGroupRepository interface {
	GetUserTransactionGroups(ctx context.Context, userEmail string) ([]model.TransactionGroup, error)
}

type TransactionGroupHandler struct {
	dto.UnimplementedTransactionGroupServiceServer

	transactionGroupService transactionGroupRepository
}

func SplitTypeFromDto(splitType dto.SplitType) (model.SplitType, error) {
	switch splitType {
	case dto.SplitType_Equal:
		return model.SplitTypeEqual, nil
	case dto.SplitType_Percentage:
		return model.SplitTypePercentage, nil
	case dto.SplitType_Share:
		return model.SplitTypeShare, nil
	default:
		return model.SplitTypeEqual, fmt.Errorf("unknown SplitType %s", splitType)
	}
}

func SplitTypeToDto(splitType model.SplitType) (dto.SplitType, error) {
	switch splitType {
	case model.SplitTypeEqual:
		return dto.SplitType_Equal, nil
	case model.SplitTypePercentage:
		return dto.SplitType_Percentage, nil
	case model.SplitTypeShare:
		return dto.SplitType_Share, nil
	default:
		return dto.SplitType_Equal, fmt.Errorf("unknown SplitType %s", splitType)
	}
}

func (h *TransactionGroupHandler) GetAllTransactionGroups(ctx context.Context, req *dto.GetAllTransactionGroupsRequest) (*dto.GetAllTransactionGroupsResponse, error) {
	claims, ok := ctx.Value(shared.ClaimsKey{}).(shared.Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	transactionGroups, err := h.transactionGroupService.GetUserTransactionGroups(ctx, claims.Email)
	if err != nil {
		return nil, fmt.Errorf("getting all transaction groups for user %s: %s", claims.Email, err)
	}

	transactionGroupsDto := make([]*dto.TransactionGroup, len(transactionGroups))
	for i, transactionGroup := range transactionGroups {

		splitTypeDto, err := SplitTypeToDto(transactionGroup.SplitType)
		if err != nil {
			return nil, fmt.Errorf("converting split type to dto when building get all transaction groups response")
		}

		membersDto := make([]*dto.TransactionGroupMember, len(transactionGroup.Members))
		for j, member := range transactionGroup.Members {
			var splitValue *float32

			if tentativeValue, isSome := member.SplitValue.Value(); isSome {
				splitValue = &tentativeValue
			}

			logging.FromContext(ctx).Info(string(member.Email))

			membersDto[j] = &dto.TransactionGroupMember{
				Email:      string(member.Email),
				Name:       member.Name,
				SplitValue: splitValue,
			}
		}

		var currency *uint32
		if currencyValue, isSome := transactionGroup.Currency.Value(); isSome {
			castedValue := uint32(currencyValue)
			currency = &castedValue
		}

		var category *uint32
		if categoryValue, isSome := transactionGroup.Category.Value(); isSome {
			castedValue := uint32(categoryValue)
			category = &castedValue
		}

		transactionGroupsDto[i] = &dto.TransactionGroup{
			Id:              uint32(transactionGroup.ID),
			Name:            transactionGroup.Name,
			InitialCurrency: transactionGroup.OriginalCurrency,
			SplitType:       splitTypeDto,
			Members:         membersDto,
			Currency:        currency,
			Category:        category,
		}
	}

	return &dto.GetAllTransactionGroupsResponse{
		TransactionGroups: transactionGroupsDto,
	}, nil

}
