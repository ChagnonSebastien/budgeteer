import { Button, Stack } from '@mui/material'
import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { SecureButton } from '../components/shared/SecureButton'
import { useToast } from '../components/shared/ToastProvider'
import UnconfirmedTransactionForm, {
  UnconfirmedTransactionFormFields,
} from '../components/transactionGroup/UnconfirmedTransactionForm'
import { ReadOnlyContext } from '../service/ReadOnlyContext'
import { TransactionGroupServiceContext, UnconfirmedTransactionServiceContext } from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
  unconfirmedTransactionId: string
}

const EditUnconfirmedTransactionPage: FC = () => {
  const { transactionGroupId, unconfirmedTransactionId } = useParams<Params>()
  const navigate = useNavigate()

  const { email, authentification_method } = useContext(UserContext)
  const readOnly = useContext(ReadOnlyContext) !== null
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const {
    state: unconfirmedTransactions,
    update: updateUnconfirmedTransaction,
    delete: deleteUnconfirmedTransaction,
  } = useContext(UnconfirmedTransactionServiceContext)
  const { showToast } = useToast()

  const transactionGroup = useMemo(
    () => transactionGroups.find((tg) => tg.id === parseInt(transactionGroupId!)),
    [transactionGroups, transactionGroupId],
  )

  const unconfirmedTransaction = useMemo(
    () => unconfirmedTransactions.find((ut) => ut.id === parseInt(unconfirmedTransactionId!)),
    [unconfirmedTransactions, unconfirmedTransactionId],
  )

  const returnTo = `/transaction-groups/manage/${transactionGroupId}`

  const onSubmit = useCallback(
    async (data: UnconfirmedTransactionFormFields) => {
      if (typeof unconfirmedTransaction === 'undefined') return

      await updateUnconfirmedTransaction(
        { id: unconfirmedTransaction.id },
        { owner: data.owner, amount: data.amount, date: data.date, note: data.note },
      )
      showToast('Transaction updated')
      navigate(returnTo, { replace: true })
    },
    [unconfirmedTransaction, updateUnconfirmedTransaction, navigate, returnTo, showToast],
  )

  const onDelete = useCallback(async () => {
    if (typeof unconfirmedTransaction === 'undefined') return

    await deleteUnconfirmedTransaction({ id: unconfirmedTransaction.id })
    showToast('Transaction deleted')
    navigate(returnTo, { replace: true })
  }, [unconfirmedTransaction, deleteUnconfirmedTransaction, navigate, returnTo, showToast])

  if (!transactionGroup || !unconfirmedTransaction) {
    return <LoadingScreen />
  }

  const canPromote = unconfirmedTransaction.owner === email && authentification_method !== 'guest'

  return (
    <ContentWithHeader title="Unconfirmed transaction" action="return" withPadding withScrolling>
      <Stack direction="row" sx={{ justifyContent: 'end', gap: 1, mb: 2 }}>
        {canPromote && (
          <Button
            variant="contained"
            disabled={readOnly}
            onClick={() =>
              navigate(
                `/transaction-groups/manage/${transactionGroup.id}/unconfirmed/${unconfirmedTransaction.id}/promote`,
              )
            }
          >
            Add to my transactions
          </Button>
        )}
        <SecureButton color="error" onClick={onDelete}>
          Delete
        </SecureButton>
      </Stack>
      <UnconfirmedTransactionForm
        transactionGroup={transactionGroup}
        initialUnconfirmedTransaction={unconfirmedTransaction}
        onSubmit={onSubmit}
        submitText="Save"
      />
    </ContentWithHeader>
  )
}

export default EditUnconfirmedTransactionPage
