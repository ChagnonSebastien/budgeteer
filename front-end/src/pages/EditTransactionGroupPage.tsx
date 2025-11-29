import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import TransactionGroupForm from '../components/transactionGroup/TransactionGroupForm'
import { TransactionGroupUpdatableFields } from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
}

const EditTransactionGroupPage: FC = () => {
  const navigate = useNavigate()

  const { transactionGroupId } = useParams<Params>()
  const { update: updateTransactionGroup, state: transactionGroups } = useContext(TransactionGroupServiceContext)

  const selectedTransactionGroup = useMemo(
    () => transactionGroups.find((t) => t.id === parseInt(transactionGroupId!)),
    [transactionGroups, transactionGroupId],
  )

  const onSubmit = useCallback(
    async (data: Partial<TransactionGroupUpdatableFields>) => {
      if (typeof data.name === 'undefined') throw new Error('name cannot be undefined')
      if (data.name === '') throw new Error('name cannot be empty')
      if (typeof data.splitType === 'undefined') throw new Error('split type cannot be undefined')
      if (typeof data.currency === 'undefined' || data.currency === 0) throw new Error('currency cannot be undefined')
      if (typeof data.category === 'undefined' || data.category === 0) throw new Error('category cannot be undefined')

      await updateTransactionGroup(
        { id: selectedTransactionGroup!.id },
        {
          name: data.name,
          splitType: data.splitType,
          currency: data.currency,
          category: data.category,
        },
      )
      navigate(`/transaction-groups`, { replace: true })
    },
    [navigate, selectedTransactionGroup?.id, updateTransactionGroup],
  )

  return (
    <ContentWithHeader title={`Update transaction group`} action="return" withPadding withScrolling>
      <TransactionGroupForm
        onSubmit={onSubmit}
        submitText="Record"
        initialTransactionGroup={selectedTransactionGroup}
      />
    </ContentWithHeader>
  )
}

export default EditTransactionGroupPage
