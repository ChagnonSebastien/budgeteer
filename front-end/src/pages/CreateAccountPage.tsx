import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import AccountForm from '../components/AccountForm'
import ContentWithHeader from '../components/ContentWithHeader'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

const CreateAccountPage: FC = () => {
  const navigate = useNavigate()

  const { create: createAccount } = useContext(AccountServiceContext)

  const onSubmit = useCallback(async (data: Partial<Omit<Account, 'id'>>) => {
    if (typeof data.name === 'undefined') throw new Error('Name cannot be undefined')
    if (typeof data.initialAmounts === 'undefined') throw new Error('initialAmounts cannot be undefined')
    if (typeof data.isMine === 'undefined') throw new Error('isMine cannot be undefined')
    if (typeof data.type === 'undefined') throw new Error('type cannot be undefined')
    if (typeof data.financialInstitution === 'undefined') throw new Error('financialInstitution cannot be undefined')

    await createAccount({
      name: data.name,
      initialAmounts: data.initialAmounts,
      isMine: data.isMine,
      type: data.type,
      financialInstitution: data.financialInstitution,
    })
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
