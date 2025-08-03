import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import CurrencyForm from '../components/currencies/CurrencyForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CurrencyUpdatableFields } from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Params = {
  currencyId: string
}

interface Props {
  scriptRunner: (script: string) => Promise<string>
}

const EditCurrency: FC<Props> = ({ scriptRunner }: Props) => {
  const navigate = useNavigate()

  const { currencyId } = useParams<Params>()
  const { state: currencies, update: updateCurrencies } = useContext(CurrencyServiceContext)
  const selectedCurrency = useMemo(
    () => currencies.find((c) => c.id === parseInt(currencyId!)),
    [currencies, currencyId],
  )

  const onSubmit = useCallback(
    async (data: Partial<CurrencyUpdatableFields>) => {
      if (typeof selectedCurrency === 'undefined') return

      await updateCurrencies({ id: selectedCurrency!.id }, data)

      navigate(-1)
    },
    [updateCurrencies, selectedCurrency],
  )

  if (typeof selectedCurrency === 'undefined') {
    navigate('/currencies', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit currency" action="return" withPadding withScrolling>
      <CurrencyForm
        onSubmit={onSubmit}
        submitText="Save changes"
        initialCurrency={selectedCurrency}
        scriptRunner={scriptRunner}
      />
    </ContentWithHeader>
  )
}

export default EditCurrency
