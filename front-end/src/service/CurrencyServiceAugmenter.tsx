import { FC, useContext, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import { UserContext } from '../App'
import Currency, { CurrencyID } from '../domain/model/currency'

export interface CurrencyPersistenceAugmentation {
  tentativeDefaultCurrency: Currency | null
  augmentedVersion: number
}

export const CurrencyPersistenceAugmenter: FC<AugmenterProps<CurrencyID, Currency, CurrencyPersistenceAugmentation>> = (
  props,
) => {
  const { augment, state, version } = props
  const { default_currency } = useContext(UserContext)

  const augmentedData = useMemo(
    () => ({
      tentativeDefaultCurrency: state.find((c) => c.id === default_currency) ?? null,
      augmentedVersion: version,
    }),
    [default_currency, state, version],
  )

  return augment(augmentedData)
}
