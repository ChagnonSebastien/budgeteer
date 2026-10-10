import { FC, useContext } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import { IconToolsContext } from '../components/icons/IconTools'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import JoinTransactionGroup from '../components/transactionGroup/JoinTransactionGroup'
import TransactionGroupView from '../components/transactionGroup/TransactionGroupView'
import useAugmentedTransactionGroup from '../components/transactionGroup/useAugmentedTransactionGroup'

type Params = {
  transactionGroupId: string
}

const GuestTransactionGroupPage: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)

  const { email } = useContext(UserContext)

  const id = parseInt(transactionGroupId!)
  const transactionGroup = useAugmentedTransactionGroup(id)

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
      actions={[
        {
          label: 'I paid',
          Icon: IconLib.MdOutput,
          color: 'money.loss',
          onClick: () => navigate(`/transaction-groups/manage/${id}/unconfirmed/new?payer=me`),
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

export default GuestTransactionGroupPage
