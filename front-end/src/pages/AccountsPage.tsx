import { Button } from '@mui/material'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { AccountList } from '../components/AccountList'
import ContentWithHeader from '../components/ContentWithHeader'
import { AccountServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const navigate = useNavigate()

  const { state: accounts } = useContext(AccountServiceContext)

  return (
    <ContentWithHeader title="Accounts" button="menu">
      <div style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <AccountList accounts={accounts} onSelect={(id) => navigate(`/accounts/edit/${id}`)} showBalances />
        <div style={{ height: '1rem' }} />
        <Button fullWidth variant="contained" onClick={() => navigate('/accounts/new')}>
          New
        </Button>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsPage
