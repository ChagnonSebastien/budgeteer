import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import UnconfirmedTransactionForm, {
  UnconfirmedTransactionFormFields,
} from '../components/transactionGroup/UnconfirmedTransactionForm'
import { TransactionGroupServiceContext, UnconfirmedTransactionServiceContext } from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
}

const CreateUnconfirmedTransactionPage: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { create: createUnconfirmedTransaction } = useContext(UnconfirmedTransactionServiceContext)
  const { showToast } = useToast()

  const transactionGroup = useMemo(
    () => transactionGroups.find((tg) => tg.id === parseInt(transactionGroupId!)),
    [transactionGroups, transactionGroupId],
  )

  const onSubmit = useCallback(
    async (data: UnconfirmedTransactionFormFields) => {
      if (typeof transactionGroup === 'undefined') return

      await createUnconfirmedTransaction({
        transactionGroupId: transactionGroup.id,
        owner: data.owner,
        createdBy: email,
        amount: data.amount,
        date: data.date,
        note: data.note,
        splitOverride: null,
      })
      showToast('Transaction recorded')
      navigate(`/transaction-groups/manage/${transactionGroup.id}`, { replace: true })
    },
    [transactionGroup, createUnconfirmedTransaction, email, navigate, showToast],
  )

  if (!transactionGroup) {
    return <LoadingScreen />
  }

  return (
    <ContentWithHeader title={`Record in ${transactionGroup.name}`} action="return" withPadding withScrolling>
      <UnconfirmedTransactionForm transactionGroup={transactionGroup} onSubmit={onSubmit} submitText="Record" />
    </ContentWithHeader>
  )
}

export default CreateUnconfirmedTransactionPage
