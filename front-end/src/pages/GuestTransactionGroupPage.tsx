import { Button } from '@mui/material'
import { FC, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { groupCurrency } from '../components/transactionGroup/GroupLedger'
import JoinTransactionGroup from '../components/transactionGroup/JoinTransactionGroup'
import TransactionGroupView from '../components/transactionGroup/TransactionGroupView'
import { AugmentedTransaction, AugmentedTransactionGroupData } from '../domain/model/transaction'
import { AugmentedTransactionGroup } from '../domain/model/transactionGroup'
import {
  CategoryServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
} from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
}

const GuestTransactionGroupPage: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { state: ownTransactions, transactionsFromGroupMembers } = useContext(TransactionServiceContext)
  // Only satisfies AugmentedTransactionGroup: guests never promote, the one use of the group category.
  const { tentativeRoot: rootCategory } = useContext(CategoryServiceContext)

  const id = parseInt(transactionGroupId!)

  const transactionGroup = useMemo(() => {
    const group = transactionGroups.find((tg) => tg.id === id)
    if (!group || !rootCategory) return undefined
    return new AugmentedTransactionGroup(group, groupCurrency(group), rootCategory)
  }, [transactionGroups, id, rootCategory])

  const confirmedTransactions = useMemo(() => {
    if (!transactionGroup) return []
    const currency = transactionGroup.augmentedCurrency
    return [...ownTransactions, ...transactionsFromGroupMembers]
      .filter((t) => t.transactionGroupData?.transactionGroupId === id)
      .map(
        (t) =>
          new AugmentedTransaction(
            t,
            null,
            new AugmentedTransactionGroupData(t.transactionGroupData!, transactionGroup),
            currency,
            currency,
          ),
      )
  }, [ownTransactions, transactionsFromGroupMembers, id, transactionGroup])

  if (!transactionGroup) {
    return <LoadingScreen />
  }

  if (!transactionGroup.members.find((m) => m.email === email)?.joined) {
    return (
      <ContentWithHeader title="Join transaction group" action="menu" withPadding withScrolling>
        <JoinTransactionGroup transactionGroup={transactionGroup} />
      </ContentWithHeader>
    )
  }

  return (
    <TransactionGroupView
      transactionGroup={transactionGroup}
      confirmedTransactions={confirmedTransactions}
      actions={
        <Button variant="outlined" onClick={() => navigate(`/transaction-groups/manage/${id}/unconfirmed/new`)}>
          Record a payment
        </Button>
      }
    />
  )
}

export default GuestTransactionGroupPage
