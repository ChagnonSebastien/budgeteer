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
    async (data: Omit<Transaction, 'id'>) => {
      await createTransaction(data)
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
