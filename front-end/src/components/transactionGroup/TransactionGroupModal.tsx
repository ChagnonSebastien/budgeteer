import { Stack } from '@mui/material'
import { format } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { dateRange, GroupSummary } from './TransactionGroupCard'
import useAugmentedTransactionGroup from './useAugmentedTransactionGroup'
import useGroupTransactions, { canDeleteGroup } from './useGroupTransactions'
import { UserContext } from '../../App'
import { formatFull } from '../../domain/model/currency'
import TransactionGroup, { SplitTypeToString } from '../../domain/model/transactionGroup'
import {
  SettlementServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../shared/FancyModal'
import { useToast } from '../shared/ToastProvider'

const TransactionGroupModal: FC<{ group: TransactionGroup; summary?: GroupSummary; onClose(): void }> = ({
  group,
  summary,
  onClose,
}) => {
  const navigate = useNavigate()
  const { email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const { update: updateGroup, delete: deleteGroup } = useContext(TransactionGroupServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)
  const { refresh: refreshSettlements } = useContext(SettlementServiceContext)
  const { showToast } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const augmentedGroup = useAugmentedTransactionGroup(group.id)
  const transactions = useGroupTransactions(augmentedGroup)
  const joined = group.hasJoined(email)
  const deletable = joined && canDeleteGroup(transactions, email)

  const toggleHidden = async () => {
    try {
      await updateGroup({ id: group.id }, { hidden: !group.hidden })
      showToast(group.hidden ? 'Group unhidden' : 'Group hidden')
      onClose()
    } catch {
      showToast('Could not update the group', 'error')
    }
  }

  const deleteIt = async () => {
    try {
      await deleteGroup({ id: group.id })
      await Promise.all([refreshTransactions(), refreshUnconfirmed(), refreshSettlements()])
      showToast('Group deleted')
      setConfirmingDelete(false)
      onClose()
    } catch {
      showToast('Could not delete the group', 'error')
    }
  }

  const balanceValue = summary
    ? summary.balance === 0
      ? 'Settled up'
      : `${summary.balance > 0 ? 'Owed' : 'Owe'} ${formatFull(summary.currency, Math.abs(summary.balance), privacyMode)}`
    : 'Not joined yet'

  return (
    <>
      <FancyDialog open onClose={onClose}>
        <FancyModal
          title={{
            topCategory: group.hidden ? 'Transaction group · Hidden' : 'Transaction group',
            bigTitle: group.name,
            bottomSpec: { IconComponent: IconLib.MdCalendarToday, text: `Created ${format(group.createdAt, 'PPP')}` },
          }}
          bottomMenu={[
            {
              Icon: IconLib.MdGroups,
              label: joined ? 'Open Group' : 'Join Group',
              intent: 'navigate',
              description: joined ? 'See its transactions and balances' : 'Accept the invitation',
              action: () => {
                onClose()
                navigate(`/transaction-groups/manage/${group.id}`)
              },
              disabled: false,
              availableOffline: joined,
            },
            {
              Icon: group.hidden ? IconLib.MdVisibility : IconLib.MdVisibilityOff,
              label: group.hidden ? 'Unhide Group' : 'Hide Group',
              intent: 'adjust',
              description: group.hidden
                ? 'Show its label on your transactions again'
                : deletable
                  ? 'Keep everything, but drop its label from your transactions'
                  : "It can't be deleted: it holds other members' transactions or settled payments",
              action: toggleHidden,
              disabled: !joined,
            },
            {
              Icon: IconLib.MdDelete,
              label: 'Delete Group',
              intent: 'destructive',
              description: 'Your transactions are kept, just unlinked',
              action: () => setConfirmingDelete(true),
              disabled: !deletable,
            },
          ]}
        >
          <DetailHeading>DETAILS</DetailHeading>
          <Stack sx={{ gap: 0.5 }}>
            <DetailCard delay={0} title="Your balance" value={balanceValue} />
            {summary && <DetailCard delay={1} title="Activity" value={dateRange(summary)} />}
            <DetailCard
              delay={2}
              title="Members"
              subTitle={group.members.map((m) => m.name).join(', ')}
              value={String(group.members.length)}
            />
            <DetailCard delay={3} title="Default split" value={SplitTypeToString(group.splitType)} />
          </Stack>
        </FancyModal>
      </FancyDialog>

      <ConfirmDeleteModal
        open={confirmingDelete}
        title="Delete this group?"
        description={`"${group.name}" is removed for every member. Your transactions stay in your books, no longer linked to it.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteIt}
      />
    </>
  )
}

export default TransactionGroupModal
