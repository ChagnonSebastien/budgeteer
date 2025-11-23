package grpc

import (
	"context"
	"fmt"

	"chagnon.dev/budget-server/internal/domain/model"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/dto"
	"chagnon.dev/budget-server/internal/infrastructure/messaging/shared"
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

			if tentativeValue, valid := member.SplitValue.Value(); valid {
				splitValue = &tentativeValue
			}

			membersDto[j] = &dto.TransactionGroupMember{
				Email:      string(member.Email),
				SplitValue: splitValue,
			}
		}

		transactionGroupsDto[i] = &dto.TransactionGroup{
			Id:              uint32(transactionGroup.ID),
			Name:            transactionGroup.Name,
			InitialCurrency: transactionGroup.OriginalCurrency,
			SplitType:       splitTypeDto,
			Members:         nil,
		}
	}

	return &dto.GetAllTransactionGroupsResponse{
		TransactionGroups: transactionGroupsDto,
	}, nil

}
