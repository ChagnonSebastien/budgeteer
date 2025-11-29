import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import TransactionGroup, { Person, TransactionGroupID } from '../domain/model/transactionGroup'

export interface TransactionGroupPersistenceAugmentation {
  knownPeople: Person[]
  augmentedVersion: number
}

export const TransactionGroupPersistenceAugmenter: FC<
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
    }),
    [knownPeople, version],
  )

  return augment(augmentedData)
}
