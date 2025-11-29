import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import useQueryParams from '../components/shared/useQueryParams'
import TransactionForm, { TransactionType } from '../components/transactions/TransactionForm'
import { TransactionUpdatableFields } from '../domain/model/transaction'
import { TransactionServiceContext } from '../service/ServiceContext'

type QueryParams = {
  type: string
}

const CreateTransactionPage: FC = () => {
  const navigate = useNavigate()
  const { queryParams } = useQueryParams<QueryParams>()
  const type = useMemo(() => (queryParams.type ?? 'expense') as TransactionType, [queryParams.type])

  const { create: createTransaction } = useContext(TransactionServiceContext)

  const onSubmit = useCallback(
    async (data: Partial<TransactionUpdatableFields>) => {
      if (typeof data.amount === 'undefined') throw new Error('amount cannot be undefined')
      if (typeof data.currencyId === 'undefined') throw new Error('currencyId cannot be undefined')
      if (typeof data.categoryId === 'undefined') throw new Error('categoryId cannot be undefined')
      if (typeof data.date === 'undefined') throw new Error('date cannot be undefined')
      if (typeof data.senderId === 'undefined') throw new Error('senderId cannot be undefined')
      if (typeof data.receiverId === 'undefined') throw new Error('receiverId cannot be undefined')
      if (typeof data.note === 'undefined') throw new Error('note cannot be undefined')
      if (typeof data.receiverCurrencyId === 'undefined') throw new Error('receiverCurrencyId cannot be undefined')
      if (typeof data.receiverAmount === 'undefined') throw new Error('receiverAmount cannot be undefined')

      await createTransaction({
        amount: data.amount,
        currencyId: data.currencyId,
        categoryId: data.categoryId,
        date: data.date,
        senderId: data.senderId,
        receiverId: data.receiverId,
        note: data.note,
        receiverCurrencyId: data.receiverCurrencyId,
        receiverAmount: data.receiverAmount,
        financialIncomeData: data.financialIncomeData ?? null,
      })
      navigate(`/transactions`, { replace: true })
    },
    [navigate],
  )

  return (
    <ContentWithHeader
      title={`Record new ${type === 'financialIncome' ? 'financial income' : (type ?? 'transaction')}`}
      action="return"
      withPadding
      withScrolling
    >
      <TransactionForm onSubmit={onSubmit} submitText="Record" type={type} />
    </ContentWithHeader>
  )
}

export default CreateTransactionPage
