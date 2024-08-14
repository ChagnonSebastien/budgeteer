import Transaction from "../../../domain/model/transaction"
import { Transaction as TransactionDto } from "../dto/transaction"
import { Converter } from "./converter"

function padToTwoDigits(num: number) {
  return num.toString().padStart(2, "0")
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

export class TransactionConverter implements Converter<Transaction, TransactionDto> {

  async toModel(dto: TransactionDto): Promise<Transaction> {
    return new Transaction(
      dto.id,
      dto.amount,
      dto.currency,
      dto.category,
      new Date(dto.date),
      dto.sender ?? null,
      dto.receiver ?? null,
      dto.note,
    )
  }

  toDTO(model: Transaction): TransactionDto {
    return TransactionDto.create({
      id: model.id,
      amount: model.amount,
      category: model.categoryId,
      currency: model.currencyId,
      date: `${formatDateTime(model.date)}`,
      note: model.note,
      receiver: model.receiverId ?? undefined,
      sender: model.senderId ?? undefined,
    })
  }

}       