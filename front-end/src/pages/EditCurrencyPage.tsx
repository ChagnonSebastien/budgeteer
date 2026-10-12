import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CurrencyForm from '../components/currencies/CurrencyForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import { CurrencyUpdatableFields } from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Params = {
  currencyId: string
}

const EditCurrency: FC = () => {
  const navigate = useNavigate()

  const { currencyId } = useParams<Params>()
  const { state: currencies, update: updateCurrencies } = useContext(CurrencyServiceContext)
  const { showToast } = useToast()
  const selectedCurrency = useMemo(
    () => currencies.find((c) => c.id === parseInt(currencyId!)),
    [currencies, currencyId],
  )

  const onSubmit = useCallback(
    async (data: Partial<CurrencyUpdatableFields>) => {
      if (typeof selectedCurrency === 'undefined') return

      await updateCurrencies({ id: selectedCurrency!.id }, data)

      showToast('Asset updated')
      navigate(-1)
    },
    [updateCurrencies, selectedCurrency, navigate, showToast],
  )

  if (typeof selectedCurrency === 'undefined') {
    navigate('/assets', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit asset" action="return" withPadding withScrolling>
      <CurrencyForm onSubmit={onSubmit} submitText="Save changes" initialCurrency={selectedCurrency} />
    </ContentWithHeader>
  )
}

export default EditCurrency
