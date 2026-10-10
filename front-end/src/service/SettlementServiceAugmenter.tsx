import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Settlement, { SettlementID, SettlementUpdatableFields } from '../domain/model/settlement'
import { PromotionFields } from '../domain/model/unconfirmedTransaction'
import { NewSettlement } from '../store/remote/SettlementRemoteStore'

// Online only; callers must refresh the settlement and transaction contexts after.
export interface SettlementPersistenceAugmentation {
  createSettlement(settlement: NewSettlement, own: PromotionFields | null): Promise<void>
  updateSettlement(id: SettlementID, fields: SettlementUpdatableFields, own: PromotionFields | null): Promise<void>
  confirmSettlement(id: SettlementID, own: PromotionFields | null): Promise<void>
  recordSettlementTransaction(id: SettlementID, own: PromotionFields): Promise<void>
}

export const makeSettlementPersistenceAugmenter = (
  remote: SettlementPersistenceAugmentation,
): FC<AugmenterProps<SettlementID, Settlement, SettlementPersistenceAugmentation>> => {
  const SettlementPersistenceAugmenter: FC<
    AugmenterProps<SettlementID, Settlement, SettlementPersistenceAugmentation>
  > = ({ augment }) => {
    const augmentedData = useMemo<SettlementPersistenceAugmentation>(
      () => ({
        createSettlement: (settlement, own) => remote.createSettlement(settlement, own),
        updateSettlement: (id, fields, own) => remote.updateSettlement(id, fields, own),
        confirmSettlement: (id, own) => remote.confirmSettlement(id, own),
        recordSettlementTransaction: (id, own) => remote.recordSettlementTransaction(id, own),
      }),
      [],
    )

    return augment(augmentedData)
  }

  return SettlementPersistenceAugmenter
}
