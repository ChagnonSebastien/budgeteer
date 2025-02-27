import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrencyForm from '../components/CurrencyForm'
import Currency from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

const FormContainer = styled.div`
  width: 100%;
  max-width: 35rem;
  margin: auto;
`

const CreateCurrencyPage: FC = () => {
  const navigate = useNavigate()

  const { create: createCurrency } = useContext(CurrencyServiceContext)

  const onSubmit = useCallback(async (data: Partial<Omit<Currency, 'id'>>) => {
    if (typeof data.name === 'undefined') throw new Error('Name cannot be undefined')
    if (typeof data.symbol === 'undefined') throw new Error('Symbol cannot be undefined')
    if (typeof data.decimalPoints === 'undefined') throw new Error('Decimal Points cannot be undefined')
    if (typeof data.exchangeRates === 'undefined') throw new Error('Exchange Rates cannot be undefined')

    await createCurrency({
      name: data.name,
      symbol: data.symbol,
      exchangeRates: data.exchangeRates,
      decimalPoints: data.decimalPoints,
    })
    navigate('/currency', { replace: true })
  }, [])

  return (
    <ContentWithHeader title="Create new currency" button="return">
      <FormContainer className="p-4">
        <CurrencyForm onSubmit={onSubmit} submitText="Create" />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default CreateCurrencyPage
