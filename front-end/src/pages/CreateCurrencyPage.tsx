import { FC, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import CurrencyForm, { ExchangeRateConfig } from '../components/currencies/CurrencyForm'
import useCreateCurrency from '../components/currencies/useCreateCurrency'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import { CurrencyUpdatableFields } from '../domain/model/currency'

const CreateCurrencyPage: FC = () => {
  const navigate = useNavigate()
  const createCurrency = useCreateCurrency()
  const { showToast } = useToast()

  const onSubmit = useCallback(
    async (data: Partial<CurrencyUpdatableFields>, exchangeRates?: ExchangeRateConfig[]) => {
      await createCurrency(data, exchangeRates)
      showToast('Currency created')
      navigate('/currency', { replace: true })
    },
    [createCurrency, navigate, showToast],
  )

  return (
    <ContentWithHeader title="Create new currency" action="return" withPadding withScrolling>
      <CurrencyForm onSubmit={onSubmit} submitText="Create" />
    </ContentWithHeader>
  )
}

export default CreateCurrencyPage
