import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrencyForm from '../components/CurrencyForm'
import Currency from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

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
      <div style={{ padding: '1rem' }}>
        <CurrencyForm onSubmit={onSubmit} submitText="Create" />
      </div>
    </ContentWithHeader>
  )
}

export default CreateCurrencyPage
