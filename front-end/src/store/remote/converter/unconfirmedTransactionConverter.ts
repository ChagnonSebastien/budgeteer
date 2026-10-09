import { Converter } from './converter'
import { formatDateTime, splitTypeFromDto, splitTypeOverrideToDto } from './transactionConverter'
import { MemberValue, SplitOverride } from '../../../domain/model/transaction'
import UnconfirmedTransaction, {
  UnconfirmedTransactionUpdatableFields,
} from '../../../domain/model/unconfirmedTransaction'
import { MemberSplitValue as MemberSplitValueDTO, SplitOverride as SplitOverrideDTO } from '../dto/transaction'
import {
  UnconfirmedTransaction as UnconfirmedTransactionDto,
  UpdateUnconfirmedTransactionFields as UpdateUnconfirmedTransactionFieldsDTO,
} from '../dto/unconfirmedTransaction'

export const splitOverrideToDto = (splitOverride: SplitOverride | null): SplitOverrideDTO | undefined =>
  splitOverride
    ? SplitOverrideDTO.create({
        splitTypeOverride: splitTypeOverrideToDto(splitOverride.splitTypeOverride),
        memberSplitValues: splitOverride.memberValues.map((m) =>
          MemberSplitValueDTO.create({ email: m.email, splitValue: m.value ?? undefined }),
        ),
      })
    : undefined

const splitOverrideFromDto = (splitOverride: SplitOverrideDTO | undefined): SplitOverride | null =>
  typeof splitOverride !== 'undefined'
    ? new SplitOverride(
        splitTypeFromDto(splitOverride.splitTypeOverride),
        splitOverride.memberSplitValues.map((mv) => new MemberValue(mv.email, mv.splitValue ?? null)),
      )
    : null

export class UnconfirmedTransactionConverter
  implements
    Converter<
      UnconfirmedTransaction,
      UnconfirmedTransactionDto,
      UnconfirmedTransactionUpdatableFields,
      UpdateUnconfirmedTransactionFieldsDTO
    >
{
  toModel(dto: UnconfirmedTransactionDto): UnconfirmedTransaction {
    return new UnconfirmedTransaction(
      dto.id,
      dto.transactionGroup,
      dto.owner,
      dto.createdBy,
      dto.amount,
      new Date(dto.date),
      dto.note,
      splitOverrideFromDto(dto.splitOverride),
    )
  }

  toDTO(model: UnconfirmedTransaction): UnconfirmedTransactionDto {
    return UnconfirmedTransactionDto.create({
      id: model.id,
      transactionGroup: model.transactionGroupId,
      owner: model.owner,
      createdBy: model.createdBy,
      amount: model.amount,
      date: formatDateTime(model.date),
      note: model.note,
      splitOverride: splitOverrideToDto(model.splitOverride),
    })
  }

  toUpdateDTO(model: Partial<UnconfirmedTransactionUpdatableFields>): UpdateUnconfirmedTransactionFieldsDTO {
    return UpdateUnconfirmedTransactionFieldsDTO.create({
      owner: model.owner,
      amount: model.amount,
      date: typeof model.date !== 'undefined' ? formatDateTime(model.date) : undefined,
      note: model.note,
      updateSplitOverride: typeof model.splitOverride !== 'undefined',
      splitOverride: model.splitOverride ? splitOverrideToDto(model.splitOverride) : undefined,
    })
  }
}
