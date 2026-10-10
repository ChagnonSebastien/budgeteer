import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import AccountForm from '../components/accounts/AccountForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

export const useCreateAccount = (onCreated: () => void) => {
  const { create: createAccount } = useContext(AccountServiceContext)
  const { showToast } = useToast()

  return useCallback(
    async (data: Partial<Omit<Account, 'id' | 'hasName'>>) => {
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
      showToast('Account created')
      onCreated()
    },
    [createAccount, onCreated, showToast],
  )
}

const CreateAccountPage: FC = () => {
  const navigate = useNavigate()
  const onSubmit = useCreateAccount(useCallback(() => navigate('/accounts', { replace: true }), [navigate]))

  return (
    <ContentWithHeader title="Create new account" action="return" withPadding withScrolling>
      <AccountForm onSubmit={onSubmit} submitText="Create" />
    </ContentWithHeader>
  )
}

export default CreateAccountPage
