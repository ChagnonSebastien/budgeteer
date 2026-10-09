import { Button } from '@mui/material'
import { FC, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import JoinTransactionGroup from '../components/transactionGroup/JoinTransactionGroup'
import TransactionGroupView from '../components/transactionGroup/TransactionGroupView'
import MixedAugmentation from '../service/MixedAugmentation'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
}

const ManageTransactionGroup: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { state: rawTransactionGroups } = useContext(TransactionGroupServiceContext)
  const {
    augmentedTransactions: transactions,
    augmentedTransactionsFromGroupMembers: transactionsFromGroupMembers,
    augmentedTransactionGroups: transactionGroups,
  } = useContext(MixedAugmentation)

  const id = parseInt(transactionGroupId!)

  const rawTransactionGroup = useMemo(() => rawTransactionGroups.find((t) => t.id === id), [rawTransactionGroups, id])
  const selectedTransactionGroup = useMemo(() => transactionGroups.find((t) => t.id === id), [transactionGroups, id])

  const confirmedTransactions = useMemo(
    () => [
      ...transactions.filter((t) => t.transactionGroupData?.transactionGroupId === id && t.getType() === 'expense'),
      // Other members' transactions have no category or accounts, so getType() can't classify them.
      ...transactionsFromGroupMembers.filter((t) => t.transactionGroupData?.transactionGroupId === id),
    ],
    [transactions, transactionsFromGroupMembers, id],
  )

  if (rawTransactionGroup && !rawTransactionGroup.members.find((m) => m.email === email)?.joined) {
    return (
      <ContentWithHeader title="Join transaction group" action="menu" withPadding withScrolling>
        <JoinTransactionGroup transactionGroup={rawTransactionGroup} />
      </ContentWithHeader>
    )
  }

  if (!selectedTransactionGroup) {
    return <LoadingScreen />
  }

  return (
    <TransactionGroupView
      transactionGroup={selectedTransactionGroup}
      confirmedTransactions={confirmedTransactions}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() =>
              navigate('/transactions/new', {
                state: { from: `/transaction-groups/manage/${id}`, prefillTransactionGroupId: id },
              })
            }
          >
            Record for myself
          </Button>
          <Button variant="outlined" onClick={() => navigate(`/transaction-groups/manage/${id}/unconfirmed/new`)}>
            Record for a member
          </Button>
        </>
      }
    />
  )
}

export default ManageTransactionGroup
