import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import TransactionGroup, {
  MemberSplitValues,
  Person,
  SplitChangeScope,
  SplitType,
  TransactionGroupID,
} from '../domain/model/transactionGroup'

interface SplitChanger {
  changeSplit(
    id: TransactionGroupID,
    splitType: SplitType,
    memberValues: MemberSplitValues,
    scope: SplitChangeScope,
  ): Promise<void>
}

export interface TransactionGroupPersistenceAugmentation extends SplitChanger {
  knownPeople: Person[]
  augmentedVersion: number
}

export const makeTransactionGroupPersistenceAugmenter = (
  splitChanger: SplitChanger,
): FC<AugmenterProps<TransactionGroupID, TransactionGroup, TransactionGroupPersistenceAugmentation>> => {
  const TransactionGroupPersistenceAugmenter: FC<
    AugmenterProps<TransactionGroupID, TransactionGroup, TransactionGroupPersistenceAugmentation>
  > = (props) => {
    const { augment, state, version } = props

    const knownPeople = useMemo(() => {
      const members = []
      const visited = new Set<string>()
      for (const tg of state) {
        for (const member of tg.members) {
          if (visited.has(member.email)) continue
          visited.add(member.email)
          members.push(member)
        }
      }
      return members
    }, [state])

    const augmentedData = useMemo(
      () => ({
        knownPeople: knownPeople,
        augmentedVersion: version,
        // Online only; callers must refresh the group, transaction and unconfirmed contexts after.
        changeSplit: (
          id: TransactionGroupID,
          splitType: SplitType,
          memberValues: MemberSplitValues,
          scope: SplitChangeScope,
        ) => splitChanger.changeSplit(id, splitType, memberValues, scope),
      }),
      [knownPeople, version],
    )

    return augment(augmentedData)
  }

  return TransactionGroupPersistenceAugmenter
}
