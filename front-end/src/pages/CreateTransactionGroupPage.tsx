import { FC, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import TransactionGroupForm from '../components/transactionGroup/TransactionGroupForm'
import { TransactionGroupUpdatableFields } from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const CreateTransactionGroupPage: FC = () => {
  const navigate = useNavigate()

  const { create: createTransactionGroup } = useContext(TransactionGroupServiceContext)

  const onSubmit = useCallback(
    async (data: Partial<TransactionGroupUpdatableFields>) => {
      if (typeof data.name === 'undefined') throw new Error('name cannot be undefined')
      if (data.name === '') throw new Error('name cannot be empty')
      if (typeof data.splitType === 'undefined') throw new Error('split type cannot be undefined')
      if (typeof data.currency === 'undefined' || data.currency === 0) throw new Error('currency cannot be undefined')
      if (typeof data.category === 'undefined' || data.category === 0) throw new Error('category cannot be undefined')

      await createTransactionGroup({
        name: data.name,
        splitType: data.splitType,
        currency: data.currency,
        category: data.category,
      })
      navigate(`/transaction-groups`, { replace: true })
    },
    [navigate],
  )

  return (
    <ContentWithHeader title={`Create new transaction group`} action="return" withPadding withScrolling>
      <TransactionGroupForm onSubmit={onSubmit} submitText="Record" />
    </ContentWithHeader>
  )
}

export default CreateTransactionGroupPage
