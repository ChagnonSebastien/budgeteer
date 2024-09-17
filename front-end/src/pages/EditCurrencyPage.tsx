import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrencyForm from '../components/CurrencyForm'
import Currency from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Params = {
  currencyId: string
}

const EditCurrency: FC = () => {
  const navigate = useNavigate()

  const { currencyId } = useParams<Params>()
  const { state: currencies, update: updateCurrencies } = useContext(CurrencyServiceContext)
  const selectedCurrency = useMemo(
    () => currencies.find((c) => c.id === parseInt(currencyId!)),
    [currencies, currencyId],
  )

  const onSubmit = useCallback(
    async (data: Omit<Currency, 'id'>) => {
      if (typeof selectedCurrency === 'undefined') return

      await updateCurrencies(selectedCurrency!.id, data)

      navigate('/currencies')
    },
    [updateCurrencies, selectedCurrency],
  )

  if (typeof selectedCurrency === 'undefined') {
    navigate('/currencies')
    return null
  }

  return (
    <ContentWithHeader title="Edit currency" button="return">
      <div style={{ padding: '1rem' }}>
        <CurrencyForm onSubmit={onSubmit} submitText="Save changes" initialCurrency={selectedCurrency} />
      </div>
    </ContentWithHeader>
  )
}

export default EditCurrency
