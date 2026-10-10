import { useCallback, useContext } from 'react'

import { ExchangeRateConfig } from './CurrencyForm'
import Currency, { CurrencyUpdatableFields } from '../../domain/model/currency'
import { ExchangeRateIdentifiableFields } from '../../domain/model/exchangeRate'
import { CurrencyServiceContext, ExchangeRateServiceContext } from '../../service/ServiceContext'

const useCreateCurrency = () => {
  const { create: createCurrency } = useContext(CurrencyServiceContext)
  const { create: createExchangeRate } = useContext(ExchangeRateServiceContext)

  return useCallback(
    async (data: Partial<CurrencyUpdatableFields>, exchangeRates?: ExchangeRateConfig[]): Promise<Currency> => {
      if (typeof data.name === 'undefined') throw new Error('Name cannot be undefined')
      if (typeof data.symbol === 'undefined') throw new Error('Symbol cannot be undefined')
      if (typeof data.risk === 'undefined') throw new Error('Risk cannot be undefined')
      if (typeof data.type === 'undefined') throw new Error('Type cannot be undefined')
      if (typeof data.decimalPoints === 'undefined') throw new Error('Decimal Points cannot be undefined')
      if (typeof exchangeRates === 'undefined') throw new Error('Exchange Rates cannot be undefined')
      if (typeof data.rateAutoupdateSettings === 'undefined')
        throw new Error('Rate Autoupdate Settings cannot be undefined')

      const newCurrency = await createCurrency({
        name: data.name,
        symbol: data.symbol,
        decimalPoints: data.decimalPoints,
        rateAutoupdateSettings: data.rateAutoupdateSettings,
        type: data.type,
        risk: data.risk,
      })

      await Promise.all(
        exchangeRates.map((rate) =>
          createExchangeRate(
            {
              rate: rate.rate,
            },
            new ExchangeRateIdentifiableFields(newCurrency.id, rate.otherCurrency, rate.date),
          ),
        ),
      )

      return newCurrency
    },
    [createCurrency, createExchangeRate],
  )
}

export default useCreateCurrency
