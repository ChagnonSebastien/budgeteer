import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import CurrencyForm, { ExchangeRateConfig } from '../components/currencies/CurrencyForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CurrencyUpdatableFields } from '../domain/model/currency'
import { ExchangeRateIdentifiableFields } from '../domain/model/exchangeRate'
import { CurrencyServiceContext, ExchangeRateServiceContext } from '../service/ServiceContext'

const FormContainer = styled.div`
  width: 100%;
  margin: auto;
`

interface Props {
  scriptRunner: (script: string) => Promise<string>
}

const CreateCurrencyPage: FC<Props> = ({ scriptRunner }: Props) => {
  const navigate = useNavigate()

  const { create: createCurrency } = useContext(CurrencyServiceContext)
  const { create: createExchangeRate } = useContext(ExchangeRateServiceContext)

  const onSubmit = useCallback(async (data: Partial<CurrencyUpdatableFields>, exchangeRates?: ExchangeRateConfig[]) => {
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

    navigate('/currency', { replace: true })
  }, [])

  return (
    <ContentWithHeader title="Create new currency" button="return" contentMaxWidth="">
      <FormContainer className="p-4">
        <CurrencyForm onSubmit={onSubmit} submitText="Create" scriptRunner={scriptRunner} />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default CreateCurrencyPage
