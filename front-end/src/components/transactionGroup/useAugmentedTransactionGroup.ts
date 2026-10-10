import { useContext, useMemo } from 'react'

import { groupCurrency } from './GroupLedger'
import { AugmentedTransactionGroup, TransactionGroupID } from '../../domain/model/transactionGroup'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext, TransactionGroupServiceContext } from '../../service/ServiceContext'

export const useAugmentedTransactionGroups = (): AugmentedTransactionGroup[] => {
  const { augmentedTransactionGroups } = useContext(MixedAugmentation)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  // Only satisfies AugmentedTransactionGroup for guests: they never promote, the one use of the group category.
  const { tentativeRoot: rootCategory } = useContext(CategoryServiceContext)

  return useMemo(
    () =>
      transactionGroups.flatMap((group) => {
        const augmented = augmentedTransactionGroups.find((tg) => tg.id === group.id)
        if (augmented) return [augmented]
        if (!rootCategory) return []
        return [new AugmentedTransactionGroup(group, groupCurrency(group), rootCategory)]
      }),
    [augmentedTransactionGroups, transactionGroups, rootCategory],
  )
}

const useAugmentedTransactionGroup = (id: TransactionGroupID): AugmentedTransactionGroup | undefined => {
  const groups = useAugmentedTransactionGroups()
  return useMemo(() => groups.find((tg) => tg.id === id), [groups, id])
}

export default useAugmentedTransactionGroup
