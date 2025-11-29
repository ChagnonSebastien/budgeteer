import { Converter } from './converter'
import Transaction, {
  FinancialIncomeData,
  MemberValue,
  SplitOverride,
  SplitTypeOverride,
  TransactionGroupData,
  TransactionUpdatableFields,
} from '../../../domain/model/transaction'
import {
  FinancialIncomeData as FinancialIncomeDataDto,
  SplitTypeOverride as SplitTypeOverrideDto,
  Transaction as TransactionDto,
  UpdateFinancialIncomeFields as UpdateFinancialIncomeFieldsDTO,
  UpdateTransactionFields as UpdateTransactionFieldsDTO,
} from '../dto/transaction'

function padToTwoDigits(num: number) {
  return num.toString().padStart(2, '0')
}
const splitTypeOverrideToDto = (type: SplitTypeOverride): SplitTypeOverrideDto => {
  switch (type) {
    case SplitTypeOverride.EQUAL:
      return SplitTypeOverrideDto.OverrideEqual
    case SplitTypeOverride.PERCENTAGE:
      return SplitTypeOverrideDto.OverridePercentage
    case SplitTypeOverride.SHARES:
      return SplitTypeOverrideDto.OverrideShare
    case SplitTypeOverride.EXACT_AMOUNT:
      return SplitTypeOverrideDto.OverrideExactAmount
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

const splitTypeFromDto = (type: SplitTypeOverrideDto): SplitTypeOverride => {
  switch (type) {
    case SplitTypeOverrideDto.OverrideEqual:
      return SplitTypeOverride.EQUAL
    case SplitTypeOverrideDto.OverridePercentage:
      return SplitTypeOverride.PERCENTAGE
    case SplitTypeOverrideDto.OverrideShare:
      return SplitTypeOverride.SHARES
    case SplitTypeOverrideDto.OverrideExactAmount:
      return SplitTypeOverride.EXACT_AMOUNT
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

export const formatDateTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = padToTwoDigits(date.getMonth() + 1)
  const day = padToTwoDigits(date.getDate())
  const hours = padToTwoDigits(date.getHours())
  const minutes = padToTwoDigits(date.getMinutes())
  const seconds = padToTwoDigits(date.getSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export class TransactionConverter
  implements Converter<Transaction, TransactionDto, TransactionUpdatableFields, UpdateTransactionFieldsDTO>
{
  toModel(dto: TransactionDto): Transaction {
    return new Transaction(
      dto.id,
      dto.amount,
      dto.currency,
      dto.category ?? null,
      new Date(dto.date),
      dto.sender ?? null,
      dto.receiver ?? null,
      dto.note,
      dto.receiverCurrency,
      dto.receiverAmount,
      typeof dto.financialIncomeData !== 'undefined'
        ? new FinancialIncomeData(dto.financialIncomeData.relatedCurrency)
        : null,
      typeof dto.transactionGroupData !== 'undefined'
        ? new TransactionGroupData(
            dto.transactionGroupData.transactionGroup,
            typeof dto.transactionGroupData.splitOverride !== 'undefined'
              ? new SplitOverride(
                  splitTypeFromDto(dto.transactionGroupData.splitOverride.splitTypeOverride),
                  dto.transactionGroupData.splitOverride.memberSplitValues.map(
                    (mv) => new MemberValue(mv.email, mv.splitValue ?? null),
                  ),
                )
              : null,
          )
        : null,
    )
  }

  toDTO(model: Transaction): TransactionDto {
    return TransactionDto.create({
      id: model.id,
      amount: model.amount,
      category: model.categoryId ?? undefined,
      currency: model.currencyId,
      date: `${formatDateTime(model.date)}`,
      note: model.note,
      receiver: model.receiverId ?? undefined,
      sender: model.senderId ?? undefined,
      receiverCurrency: model.receiverCurrencyId,
      receiverAmount: model.receiverAmount,
      financialIncomeData:
        model.financialIncomeData !== null
          ? FinancialIncomeDataDto.create({
              relatedCurrency: model.financialIncomeData.relatedCurrencyId,
            })
          : undefined,
    })
  }

  toUpdateDTO(model: Partial<TransactionUpdatableFields>): UpdateTransactionFieldsDTO {
    return UpdateTransactionFieldsDTO.create({
      amount: model.amount,
      updateCategory: typeof model.categoryId !== 'undefined',
      category: model.categoryId ?? undefined,
      currency: model.currencyId,
      date: typeof model.date !== 'undefined' ? `${formatDateTime(model.date)}` : undefined,
      note: model.note,
      updateSender: typeof model.senderId !== 'undefined',
      sender: model.senderId ?? undefined,
      updateReceiver: typeof model.receiverId !== 'undefined',
      receiver: model.receiverId ?? undefined,
      receiverCurrency: model.receiverCurrencyId,
      receiverAmount: model.receiverAmount,
      updateFinancialIncome: typeof model.financialIncomeData !== 'undefined',
      updateFinancialIncomeFields: model.financialIncomeData
        ? UpdateFinancialIncomeFieldsDTO.create({
            relatedCurrency: model.financialIncomeData.relatedCurrencyId ?? undefined,
          })
        : undefined,
    })
  }
}
