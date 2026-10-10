import { useContext, useMemo } from 'react'

import { groupCurrency } from './GroupLedger'
import { AugmentedTransactionGroup, TransactionGroupID } from '../../domain/model/transactionGroup'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext, TransactionGroupServiceContext } from '../../service/ServiceContext'

const useAugmentedTransactionGroup = (id: TransactionGroupID): AugmentedTransactionGroup | undefined => {
  const { augmentedTransactionGroups } = useContext(MixedAugmentation)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  // Only satisfies AugmentedTransactionGroup for guests: they never promote, the one use of the group category.
  const { tentativeRoot: rootCategory } = useContext(CategoryServiceContext)

  return useMemo(() => {
    const augmented = augmentedTransactionGroups.find((tg) => tg.id === id)
    if (augmented) return augmented
    const group = transactionGroups.find((tg) => tg.id === id)
    if (!group || !rootCategory) return undefined
    return new AugmentedTransactionGroup(group, groupCurrency(group), rootCategory)
  }, [augmentedTransactionGroups, transactionGroups, rootCategory, id])
}

export default useAugmentedTransactionGroup
