import { FC, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import { IconToolsContext } from '../components/icons/IconTools'
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
  const { IconLib } = useContext(IconToolsContext)

  const { email } = useContext(UserContext)
  const { state: rawTransactionGroups } = useContext(TransactionGroupServiceContext)
  const { augmentedTransactionGroups: transactionGroups } = useContext(MixedAugmentation)

  const id = parseInt(transactionGroupId!)

  const rawTransactionGroup = useMemo(() => rawTransactionGroups.find((t) => t.id === id), [rawTransactionGroups, id])
  const selectedTransactionGroup = useMemo(() => transactionGroups.find((t) => t.id === id), [transactionGroups, id])

  const joined = rawTransactionGroup?.hasJoined(email) ?? false
  if (
    rawTransactionGroup &&
    (!joined || rawTransactionGroup.currency === null || rawTransactionGroup.category === null)
  ) {
    return (
      <ContentWithHeader
        title={joined ? 'Set up transaction group' : 'Join transaction group'}
        action="menu"
        withPadding
        withScrolling
      >
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
      actions={[
        {
          label: 'I paid',
          Icon: IconLib.MdOutput,
          color: 'money.loss',
          onClick: () =>
            navigate('/transactions/new', {
              state: { from: `/transaction-groups/manage/${id}`, prefillTransactionGroupId: id },
            }),
        },
        {
          label: 'Someone else paid',
          Icon: IconLib.MdGroups,
          color: 'intent.edit',
          onClick: () => navigate(`/transaction-groups/manage/${id}/unconfirmed/new?payer=others`),
        },
      ]}
    />
  )
}

export default ManageTransactionGroup
