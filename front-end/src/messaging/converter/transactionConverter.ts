import { Transaction } from "../../domain/model/transaction";
import { Timestamp } from "../dto/google/protobuf/timestamp";
import { Transaction as TransactionDto } from "../dto/transaction";
import { Converter } from "./converter";

export class TransactionConverter implements Converter<TransactionDto, Transaction> {

    toDTO(model: TransactionDto): Transaction {
            return new Transaction(model.id, model.amount, model.currency, model.category, new Date(Number(model.date?.seconds ?? 0)), model.sender, model.receiver, model.note)
    }

    toModel(dto: Transaction): TransactionDto {
        return TransactionDto.create({
            id: dto.id,
            amount: dto.amount,
            category: dto.category,
            currency: dto.currency,
            date: Timestamp.fromDate(dto.date),
            note: dto.note,
            receiver: dto.receiver,
            sender: dto.sender,
        })
    }
    
}       