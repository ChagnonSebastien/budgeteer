import { useIonRouter } from '@ionic/react'
import { Button } from '@mui/material'
import { FC, useContext } from 'react'

import ContentWithHeader from '../components/ContentWithHeader'
import { CurrencyList } from '../components/CurrencyList'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const router = useIonRouter()

  const { state: currencies } = useContext(CurrencyServiceContext)

  return (
    <ContentWithHeader title="Currencies" button="menu">
      <div style={{ padding: '1rem' }}>
        <Button onClick={() => router.push('/currencies/new')}>New</Button>
        <div style={{ height: '1rem' }} />
        <CurrencyList
          currencies={currencies}
          onSelect={(currencyId) => router.push(`/currencies/edit/${currencyId}`)}
        />
      </div>
    </ContentWithHeader>
  )
}

export default CurrenciesPage
