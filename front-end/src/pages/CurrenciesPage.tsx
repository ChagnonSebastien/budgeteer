import { Button } from '@mui/material'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import { CurrencyList } from '../components/CurrencyList'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()

  const { state: currencies } = useContext(CurrencyServiceContext)

  return (
    <ContentWithHeader title="Currencies" button="menu">
      <div style={{ padding: '1rem' }}>
        <Button fullWidth variant="contained" onClick={() => navigate('/currencies/new')}>
          New
        </Button>
        <div style={{ height: '1rem' }} />
        <CurrencyList currencies={currencies} onSelect={(currencyId) => navigate(`/currencies/edit/${currencyId}`)} />
      </div>
    </ContentWithHeader>
  )
}

export default CurrenciesPage
