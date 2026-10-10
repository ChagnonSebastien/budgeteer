import { Button, SpeedDial, SpeedDialAction, SpeedDialIcon, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { useNavigate } from 'react-router-dom'

import ChangeSplitDialog from './ChangeSplitDialog'
import { FirstDivision, GroupPaidTable, SecondDivision } from './GroupLedger'
import GroupMembers from './GroupMembers'
import GroupTransactionModal from './GroupTransactionModal'
import SettlementModal from './SettlementModal'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { AugmentedTransaction } from '../../domain/model/transaction'
import { AugmentedTransactionGroup, SplitTypeToString } from '../../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import { SettlementServiceContext, UnconfirmedTransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import ContentWithHeader from '../shared/ContentWithHeader'
import { Row } from '../shared/Layout'
import SplitView from '../shared/SplitView'
import { useElementDimensions } from '../shared/useDimensions'
import GroupTransactionCard from '../transactions/GroupTransactionCard'
import { TransactionList } from '../transactions/TransactionList'

export interface GroupAction {
  label: string
  Icon: IconType
  color: string
  onClick(): void
}

const TransactionGroupView: FC<{
  transactionGroup: AugmentedTransactionGroup
  confirmedTransactions: AugmentedTransaction[]
  actions: GroupAction[]
}> = ({ transactionGroup, confirmedTransactions, actions }) => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const [changingSplit, setChangingSplit] = useState(false)
  const { state: unconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)
  const { state: settlements } = useContext(SettlementServiceContext)

  // Unconfirmed count toward totals: a guest's expenses can never be promoted.
  const groupTransactions = useMemo(
    () =>
      [
        ...confirmedTransactions,
        ...unconfirmedTransactions
          .filter((ut) => ut.transactionGroupId === transactionGroup.id)
          .map((ut) => new UnconfirmedAugmentedTransaction(ut, transactionGroup)),
        ...settlements
          .filter((s) => s.transactionGroupId === transactionGroup.id)
          .map((s) => new SettlementAugmentedTransaction(s, transactionGroup)),
      ].sort((a, b) => {
        if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
        return b.id - a.id
      }),
    [confirmedTransactions, unconfirmedTransactions, settlements, transactionGroup],
  )

  const [clickedKey, setClickedKey] = useState<string | null>(null)
  const clicked = groupTransactions.find((t) => t.listKey === clickedKey) ?? null

  const { width: contentWidth, ref: setContentRef } = useElementDimensions(600, 600)
  const splitHorizontal = contentWidth > 1200

  return (
    <ContentWithHeader title="Manage transaction group" action="menu" setContentRef={setContentRef}>
      <SplitView
        split={splitHorizontal ? 'horizontal' : 'vertical'}
        first={
          <FirstDivision>
            <Typography variant="h1" fontSize="2rem">
              {transactionGroup.name}
            </Typography>
            <GroupMembers transactionGroup={transactionGroup} style={{ justifyContent: 'end', alignSelf: 'stretch' }} />
            <Row style={{ alignItems: 'center', gap: '0.5rem' }}>
              <Typography fontSize="0.95rem">
                Default split: <b>{SplitTypeToString(transactionGroup.splitType)}</b>
              </Typography>
              <Button size="small" onClick={() => setChangingSplit(true)}>
                Change
              </Button>
            </Row>
            <GroupPaidTable
              members={transactionGroup.members}
              transactions={groupTransactions}
              currency={transactionGroup.augmentedCurrency}
            />
          </FirstDivision>
        }
        firstZoneStyling={{ scroll: true, grow: false }}
        second={
          <SecondDivision>
            {groupTransactions.length === 0 ? (
              <Typography color="textDisabled" alignSelf="center">
                No payments yet
              </Typography>
            ) : (
              <TransactionList
                items={groupTransactions}
                ItemComponent={GroupTransactionCard}
                additionalItemsProps={{}}
                onClick={(_id, item) => setClickedKey(item.listKey)}
                containerStyle={{ width: '100%', maxWidth: '32rem' }}
              />
            )}
          </SecondDivision>
        }
        secondZoneStyling={{ scroll: true, grow: true }}
      />
      <SpeedDial
        ariaLabel="Add to transaction group"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={
          <SpeedDialIcon
            openIcon={<IconLib.FaPlus />}
            sx={{
              '& .MuiSpeedDialIcon-icon, & .MuiSpeedDialIcon-openIcon': {
                transition: 'all 0.2s ease-in-out',
                height: '24px',
                width: '24px',
              },
              '& .MuiSpeedDialIcon-openIcon': {
                transform: 'rotate(45deg)',
              },
            }}
          />
        }
      >
        {[
          ...actions,
          {
            label: 'Settle up',
            Icon: IconLib.TbArrowsExchange,
            color: 'green',
            onClick: () => navigate(`/transaction-groups/manage/${transactionGroup.id}/settle`),
          },
        ].map(({ label, Icon, color, onClick }) => (
          <SpeedDialAction
            key={label}
            icon={<Icon />}
            onClick={onClick}
            tooltipTitle={label}
            tooltipOpen
            slotProps={{
              fab: { sx: { backgroundColor: color, color: 'white', '&:hover': { backgroundColor: color } } },
              staticTooltipLabel: { sx: { whiteSpace: 'nowrap' } },
            }}
          />
        ))}
      </SpeedDial>
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
