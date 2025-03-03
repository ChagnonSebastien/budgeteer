import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
    async (data: Partial<Omit<Currency, 'id' | 'hasName'>>) => {
      if (typeof selectedCurrency === 'undefined') return

      await updateCurrencies(selectedCurrency!.id, data)

      navigate(-1)
    },
    [updateCurrencies, selectedCurrency],
  )

  if (typeof selectedCurrency === 'undefined') {
    navigate('/currencies', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit currency" button="return">
      <FormContainer className="p-4">
        <CurrencyForm onSubmit={onSubmit} submitText="Save changes" initialCurrency={selectedCurrency} />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default EditCurrency
