import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrencyForm from '../components/CurrencyForm'
import Currency from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CreateCurrencyPage: FC = () => {
  const navigate = useNavigate()

  const { create: createCurrency } = useContext(CurrencyServiceContext)

  const onSubmit = useCallback(async (data: Omit<Currency, 'id'>) => {
    await createCurrency(data)
    navigate('/currency')
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
