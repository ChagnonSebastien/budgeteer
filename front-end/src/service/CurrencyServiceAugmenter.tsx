import { FC, useContext, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import { UserContext } from '../App'
import Currency, { CurrencyID } from '../domain/model/currency'

export interface CurrencyPersistenceAugmentation {
  tentativeDefaultCurrency: Currency | null
}

export const CurrencyPersistenceAugmenter: FC<AugmenterProps<CurrencyID, Currency, CurrencyPersistenceAugmentation>> = (
  props,
) => {
  const { augment, state } = props
  const { default_currency } = useContext(UserContext)

  const defaultCurrency = useMemo(() => state.find((c) => c.id === default_currency) ?? null, [default_currency, state])

  return augment({ tentativeDefaultCurrency: defaultCurrency })
}
