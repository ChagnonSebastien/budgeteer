import { useContext, useMemo } from 'react'

import Currency from '../../domain/model/currency'
import { CurrencyServiceContext } from '../../service/ServiceContext'

export const hasRateFetchFailure = (currency: Currency) =>
  currency.rateAutoupdateSettings.enabled && currency.rateFetchFailure !== null

export const useRateFetchFailures = (): Currency[] => {
  const { state: currencies } = useContext(CurrencyServiceContext)
  return useMemo(() => currencies.filter(hasRateFetchFailure), [currencies])
}
