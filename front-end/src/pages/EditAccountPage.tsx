import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import AccountForm from '../components/accounts/AccountForm'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

const FormContainer = styled.div`
  width: 100%;
  max-width: 35rem;
  margin: auto;
`

type Params = {
  accountId: string
}

const EditAccountPage: FC = () => {
  const navigate = useNavigate()

  const { accountId } = useParams<Params>()
  const { state: accounts, update: updateAccount } = useContext(AccountServiceContext)
  const selectedAccount = useMemo(() => accounts.find((c) => c.id === parseInt(accountId!)), [accounts, accountId])

  const onSubmit = useCallback(
    async (data: Partial<Omit<Account, 'id' | 'hasName'>>) => {
      if (typeof selectedAccount === 'undefined') return

      await updateAccount({ id: selectedAccount!.id }, data)

      navigate(-1)
    },
    [updateAccount, selectedAccount],
  )

  if (typeof selectedAccount === 'undefined') {
    navigate('/accounts', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit account" button="return">
      <FormContainer className="p-4">
        <AccountForm onSubmit={onSubmit} submitText="Save changes" initialAccount={selectedAccount} />
      </FormContainer>
    </ContentWithHeader>
  )
}

export default EditAccountPage
