import { Converter } from './converter'
import TransactionGroup, {
  Person,
  SplitType,
  TransactionGroupUpdatableFields,
} from '../../../domain/model/transactionGroup'
import {
  SplitType as SplitTypeDto,
  TransactionGroup as TransactionGroupDto,
  TransactionGroupMember,
  UpdateGroupMemberFields,
  UpdateTransactionGroupFields as UpdateTransactionGroupFieldsDTO,
} from '../dto/transactionGroup'

const splitTypeToDto = (type: SplitType): SplitTypeDto => {
  switch (type) {
    case SplitType.EQUAL:
      return SplitTypeDto.Equal
    case SplitType.PERCENTAGE:
      return SplitTypeDto.Percentage
    case SplitType.SHARES:
      return SplitTypeDto.Share
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

const splitTypeFromDto = (type: SplitTypeDto): SplitType => {
  switch (type) {
    case SplitTypeDto.Equal:
      return SplitType.EQUAL
    case SplitTypeDto.Percentage:
      return SplitType.PERCENTAGE
    case SplitTypeDto.Share:
      return SplitType.SHARES
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

export class TransactionGroupConverter
  implements
    Converter<TransactionGroup, TransactionGroupDto, TransactionGroupUpdatableFields, UpdateTransactionGroupFieldsDTO>
{
  toModel(dto: TransactionGroupDto): TransactionGroup {
    return new TransactionGroup(
      dto.id,
      dto.name,
      dto.initialCurrency,
      splitTypeFromDto(dto.splitType),
      dto.members.map((member) => new Person(member.email, member.name, member.splitValue ?? null, member.joined)),
      dto.currency ?? null,
      dto.category ?? null,
      dto.hidden,
    )
  }

  toDTO(model: TransactionGroup): TransactionGroupDto {
    return TransactionGroupDto.create({
      id: model.id,
      name: model.name,
      initialCurrency: model.originalCurrency,
      splitType: splitTypeToDto(model.splitType),
      members: model.members.map((member) =>
        TransactionGroupMember.create({
          email: member.email,
          name: member.name,
          splitValue: member.splitValue ?? undefined,
        }),
      ),
      currency: model.currency ?? undefined,
      category: model.category ?? undefined,
      hidden: model.hidden,
    })
  }

  toUpdateDTO(model: Partial<TransactionGroupUpdatableFields>): UpdateTransactionGroupFieldsDTO {
    return UpdateTransactionGroupFieldsDTO.create({
      name: model.name,
      splitType: model.splitType ? splitTypeToDto(model.splitType) : undefined,
      category: model.category ?? undefined,
      currency: model.currency ?? undefined,
      members: model.members?.map((m) =>
        UpdateGroupMemberFields.create({
          email: m.email,
          splitValue: m.splitValue ?? undefined,
        }),
      ),
      hidden: model.hidden,
    })
  }
}
