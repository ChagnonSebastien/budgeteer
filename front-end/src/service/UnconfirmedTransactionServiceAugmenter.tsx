import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import { TransactionID } from '../domain/model/transaction'
import UnconfirmedTransaction, {
  PromotionFields,
  UnconfirmedTransactionID,
} from '../domain/model/unconfirmedTransaction'
import { IdIdentifier } from '../domain/model/Unique'

export interface UnconfirmedTransactionPersistenceAugmentation {
  // Online only; callers must refresh the transaction and unconfirmed contexts after.
  promote(identity: IdIdentifier, data: PromotionFields): Promise<TransactionID>
}

interface Promoter {
  promote(identity: IdIdentifier, data: PromotionFields): Promise<TransactionID>
}

export const makeUnconfirmedTransactionPersistenceAugmenter = (
  promoter: Promoter,
): FC<
  AugmenterProps<UnconfirmedTransactionID, UnconfirmedTransaction, UnconfirmedTransactionPersistenceAugmentation>
> => {
  const UnconfirmedTransactionPersistenceAugmenter: FC<
    AugmenterProps<UnconfirmedTransactionID, UnconfirmedTransaction, UnconfirmedTransactionPersistenceAugmentation>
  > = ({ augment }) => {
    const augmentedData = useMemo(
      () => ({
        promote: (identity: IdIdentifier, data: PromotionFields) => promoter.promote(identity, data),
      }),
      [],
    )

    return augment(augmentedData)
  }

  return UnconfirmedTransactionPersistenceAugmenter
}
