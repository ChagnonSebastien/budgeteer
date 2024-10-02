import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import AccountForm from '../components/AccountForm'
import ContentWithHeader from '../components/ContentWithHeader'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

const CreateAccountPage: FC = () => {
  const navigate = useNavigate()

  const { create: createAccount } = useContext(AccountServiceContext)

  const onSubmit = useCallback(async (data: Omit<Account, 'id'>) => {
    await createAccount(data)
    navigate('/accounts', { replace: true })
  }, [])

  return (
    <ContentWithHeader title="Create new account" button="return">
      <div style={{ padding: '1rem' }}>
        <AccountForm onSubmit={onSubmit} submitText="Create" />
      </div>
    </ContentWithHeader>
  )
}

export default CreateAccountPage
