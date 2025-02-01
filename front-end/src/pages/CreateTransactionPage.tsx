import { FC, useCallback, useContext, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import TransactionForm from '../components/TransactionForm'
import Transaction from '../domain/model/transaction'
import { TransactionServiceContext } from '../service/ServiceContext'

const CreateCategoryPage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const type = useMemo(() => {
    switch (query.get('type')) {
      case 'expense':
        return 'expense'
      case 'income':
        return 'income'
      case 'transfer':
        return 'transfer'
      default:
        return undefined
    }
  }, [query])

  const { create: createTransaction } = useContext(TransactionServiceContext)

  const onSubmit = useCallback(
    async (data: Partial<Omit<Transaction, 'id'>>) => {
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
      })
      navigate(`/transactions?${query.toString()}`, { replace: true })
    },
    [navigate, query],
  )

  return (
    <ContentWithHeader title={`Record new ${type ?? 'transaction'}`} button="return">
      <div style={{ padding: '1rem' }}>
        <TransactionForm onSubmit={onSubmit} submitText="Record" type={type} />
      </div>
    </ContentWithHeader>
  )
}

export default CreateCategoryPage
