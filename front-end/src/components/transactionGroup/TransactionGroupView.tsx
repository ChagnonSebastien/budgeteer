import { Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ChangeSplitDialog from './ChangeSplitDialog'
import { FirstDivision, GroupPaidTable, SecondDivision, Section } from './GroupLedger'
import GroupMembers from './GroupMembers'
import GroupTransactionModal from './GroupTransactionModal'
import SettlementModal from './SettlementModal'
import useGroupTransactions from './useGroupTransactions'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { AugmentedTransactionGroup, SplitTypeToString } from '../../domain/model/transactionGroup'
import { IconToolsContext } from '../icons/IconTools'
import ActionSpeedDial, { DialAction } from '../shared/ActionSpeedDial'
import ContentWithHeader from '../shared/ContentWithHeader'
import { EmptyState } from '../shared/Layout'
import SplitView from '../shared/SplitView'
import useWideLayout from '../shared/useWideLayout'
import GroupTransactionCard from '../transactions/GroupTransactionCard'
import { TransactionList } from '../transactions/TransactionList'

const TransactionGroupView: FC<{
  transactionGroup: AugmentedTransactionGroup
  actions: DialAction[]
}> = ({ transactionGroup, actions }) => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const [changingSplit, setChangingSplit] = useState(false)
  const groupTransactions = useGroupTransactions(transactionGroup)

  const [clickedKey, setClickedKey] = useState<string | null>(null)
  const clicked = groupTransactions.find((t) => t.listKey === clickedKey) ?? null

  const splitHorizontal = useWideLayout()

  return (
    <ContentWithHeader title="Manage transaction group" action="menu">
      <SplitView
        split={splitHorizontal ? 'horizontal' : 'vertical'}
        first={
          <FirstDivision>
            <Stack sx={{ gap: 0.25 }}>
              <Typography component="h1" variant="h5" fontWeight="600">
                {transactionGroup.name}
              </Typography>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  Default split: {SplitTypeToString(transactionGroup.splitType)}
                </Typography>
                <Button size="small" onClick={() => setChangingSplit(true)} sx={{ minWidth: 0, textTransform: 'none' }}>
                  Change
                </Button>
              </Stack>
            </Stack>
            <Section title="Members">
              <GroupMembers transactionGroup={transactionGroup} />
            </Section>
            <Section title="Balances">
              <GroupPaidTable
                members={transactionGroup.members}
                transactions={groupTransactions}
                currency={transactionGroup.augmentedCurrency}
              />
            </Section>
          </FirstDivision>
        }
        firstZoneStyling={{ scroll: true, grow: false }}
        second={
          <SecondDivision>
            {groupTransactions.length === 0 ? (
              <EmptyState
                compact
                title="No payments yet"
                description="Add what you or others paid for the group, and the balances update for everyone."
              />
            ) : (
              <TransactionList
                items={groupTransactions}
                ItemComponent={GroupTransactionCard}
                additionalItemsProps={{}}
                onClick={(_id, item) => setClickedKey(item.listKey)}
              />
            )}
          </SecondDivision>
        }
        secondZoneStyling={{ scroll: true, grow: true }}
      />
      <ActionSpeedDial
        ariaLabel="Add to transaction group"
        actions={[
          ...actions,
          {
            label: 'Settle up',
            Icon: IconLib.TbArrowsExchange,
            color: 'intent.confirm',
            onClick: () => navigate(`/transaction-groups/manage/${transactionGroup.id}/settle`),
          },
        ]}
      />
      {clicked instanceof SettlementAugmentedTransaction ? (
        <SettlementModal settlement={clicked} onClose={() => setClickedKey(null)} />
      ) : (
        <GroupTransactionModal transaction={clicked} onClose={() => setClickedKey(null)} />
      )}
      {changingSplit && (
        <ChangeSplitDialog
          open
          onClose={() => setChangingSplit(false)}
          transactionGroup={transactionGroup}
          transactions={groupTransactions}
        />
      )}
    </ContentWithHeader>
  )
}

export default TransactionGroupView
