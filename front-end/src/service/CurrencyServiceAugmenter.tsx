import { FC, useContext, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import { UserContext } from '../App'
import Currency, { CurrencyDeletionResult, CurrencyID } from '../domain/model/currency'
import CurrencyRemoteStore from '../store/remote/CurrencyRemoteStore'

export interface CurrencyPersistenceAugmentation {
  tentativeDefaultCurrency: Currency | null
  augmentedVersion: number
  deleteCurrency(id: CurrencyID, targetId?: CurrencyID): Promise<CurrencyDeletionResult>
}

const unsupported = () => Promise.reject(new Error('deleting currencies requires the full app'))

export const makeCurrencyPersistenceAugmenter = (
  remoteStore?: CurrencyRemoteStore,
): FC<AugmenterProps<CurrencyID, Currency, CurrencyPersistenceAugmentation>> => {
  const deleteCurrency = remoteStore
    ? (id: CurrencyID, targetId?: CurrencyID) => remoteStore.deleteCurrency(id, targetId)
    : unsupported

  const CurrencyPersistenceAugmenter: FC<AugmenterProps<CurrencyID, Currency, CurrencyPersistenceAugmentation>> = (
    props,
  ) => {
    const { augment, state, version } = props
    const { default_currency } = useContext(UserContext)

    const augmentedData = useMemo(
      () => ({
        tentativeDefaultCurrency: state.find((c) => c.id === default_currency) ?? null,
        augmentedVersion: version,
        deleteCurrency,
      }),
      [default_currency, state, version],
    )

    return augment(augmentedData)
  }
  return CurrencyPersistenceAugmenter
}

export const CurrencyPersistenceAugmenter = makeCurrencyPersistenceAugmenter()
