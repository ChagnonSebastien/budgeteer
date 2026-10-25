import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext, useGuestView } from '../App'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import TransactionGroupForm, { TransactionGroupFormFields } from '../components/transactionGroup/TransactionGroupForm'
import { Person } from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const CreateTransactionGroupPage: FC = () => {
  const navigate = useNavigate()

  const { create: createTransactionGroup } = useContext(TransactionGroupServiceContext)
  const { email, name } = useContext(UserContext)
  const { showToast } = useToast()
  const isGuest = useGuestView()

  const onSubmit = useCallback(
    async (data: TransactionGroupFormFields) => {
      if (data.name === '') throw new Error('name cannot be empty')
      if (!isGuest && (!data.currency || !data.category)) throw new Error('currency and category are required')

      const created = await createTransactionGroup({
        ...data,
        hidden: false,
        members: [new Person(email, name, null, true)],
      })
      showToast('Transaction group created')
      navigate(`/transaction-groups/manage/${created.id}`, { replace: true })
    },
    [navigate, showToast, isGuest, email, name, createTransactionGroup],
  )

  return (
    <ContentWithHeader title={`Create new transaction group`} action="return" withPadding withScrolling>
      <TransactionGroupForm onSubmit={onSubmit} submitText="Record" />
    </ContentWithHeader>
  )
}

export default CreateTransactionGroupPage
