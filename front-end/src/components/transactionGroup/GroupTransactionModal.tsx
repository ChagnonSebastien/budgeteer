import { Typography } from '@mui/material'
import { format } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import TransactionSplitDialog from './TransactionSplitDialog'
import { UserContext } from '../../App'
import { formatAmount, formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, SplitTypeOverrideToString } from '../../domain/model/transaction'
import { SplitTypeToString } from '../../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import { TransactionServiceContext, UnconfirmedTransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import BasicModal from '../shared/BasicModal'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal'
import { DetailCard, FancyModal } from '../shared/FancyModal'
import { Column } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

const GroupTransactionModal: FC<{ transaction: AugmentedTransaction | null; onClose(): void }> = ({
  transaction,
  onClose,
}) => {
  const navigate = useNavigate()
  const { email, authentification_method } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const { delete: deleteTransaction } = useContext(TransactionServiceContext)
  const { delete: deleteUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)
  const { showToast } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingSplit, setEditingSplit] = useState(false)

  const groupData = transaction?.augmentedTransactionGroupData ?? null
  if (transaction === null || groupData === null) return null

  const group = groupData.transactionGroup
  const unconfirmed = transaction instanceof UnconfirmedAugmentedTransaction ? transaction.unconfirmed : null
  const isGuest = authentification_method === 'guest'
  const isMine = transaction.owner === email
  const payer = group.members.find((m) => m.email === transaction.owner)?.name ?? transaction.owner
  const contribution = transaction.getUserContribution(email)
  const groupCurrency = group.augmentedCurrency
  const canEditConfirmed = unconfirmed === null && isMine && !isGuest

  const deleteIt = async () => {
    try {
      if (unconfirmed) await deleteUnconfirmed({ id: unconfirmed.id })
      else await deleteTransaction({ id: transaction.id })
      setConfirmingDelete(false)
      onClose()
      showToast('Transaction deleted')
    } catch (err) {
      showToast('Failed to delete transaction', 'error')
      console.error(err)
    }
  }

  return (
    <>
      <BasicModal
        open
        onClose={onClose}
        slotProps={{
          paper: { style: { backgroundColor: 'transparent', borderRadius: '24px', border: '0', overflow: 'hidden' } },
        }}
      >
        <FancyModal
          title={{
            topCategory: group.name,
            bigTitle: transaction.note || 'No description',
            bottomSpec: { IconComponent: IconLib.MdCalendarToday, text: format(transaction.date, 'PPP') },
          }}
          bottomMenu={[
            {
              Icon: IconLib.MdCheckCircle,
              label: 'Confirm and add to my transactions',
              color: '#66BB6A',
              description: 'Record it in your own accounts',
              action: () => {
                onClose()
                navigate(`/transaction-groups/manage/${group.id}/unconfirmed/${unconfirmed!.id}/promote`)
              },
              disabled: unconfirmed === null || !isMine || isGuest,
            },
            {
              Icon: IconLib.MdGroups,
              label: 'Edit Split',
              color: '#FFB74D',
              description: 'Change how this transaction is shared',
              action: () => setEditingSplit(true),
              disabled: false,
            },
            {
              Icon: IconLib.MdEdit,
              label: 'Edit Transaction',
              color: '#64B5F6',
              description: 'Modify transaction details',
              action: () => {
                onClose()
                navigate(
                  unconfirmed
                    ? `/transaction-groups/manage/${group.id}/unconfirmed/${unconfirmed.id}`
                    : `/transactions/edit/${transaction.id}`,
                )
              },
              disabled: unconfirmed === null && !canEditConfirmed,
            },
            {
              Icon: IconLib.MdDelete,
              label: 'Delete Transaction',
              color: '#EF5350',
              description: 'Remove this transaction',
              action: () => setConfirmingDelete(true),
              disabled: unconfirmed === null && !canEditConfirmed,
            },
          ]}
        >
          <Typography
            variant="subtitle2"
            style={{ opacity: 0.6, marginBottom: '16px', letterSpacing: '0.05em', fontSize: '0.75rem' }}
          >
            DETAILS
          </Typography>
          <Column style={{ gap: '0.2rem' }}>
            <DetailCard
              delay={0}
              title={transaction.currency.symbol}
              subTitle={transaction.currency.name}
              value={formatAmount(transaction.currency, transaction.amount, privacyMode)}
            />
            <DetailCard delay={1} title="Paid by" value={payer} />
            <DetailCard
              delay={2}
              title="Your part"
              value={
                contribution === 0
                  ? 'Not involved'
                  : `${contribution > 0 ? 'You lent' : 'You owe'} ${formatFull(groupCurrency, Math.abs(contribution), privacyMode)}`
              }
            />
            <DetailCard
              delay={3}
              title="Split"
              subTitle={groupData.splitOverride ? 'Custom split' : 'Group default'}
              value={
                groupData.splitOverride
                  ? SplitTypeOverrideToString(groupData.splitOverride.splitTypeOverride)
                  : SplitTypeToString(group.splitType)
              }
            />
            <DetailCard
              delay={4}
              title="Status"
              value={unconfirmed ? 'Any member can edit it' : 'Confirmed by the payer'}
            />
          </Column>
        </FancyModal>
      </BasicModal>

      {editingSplit && <TransactionSplitDialog transaction={transaction} onClose={() => setEditingSplit(false)} />}

      <ConfirmDeleteModal
        open={confirmingDelete}
        title="Delete transaction?"
        description={`This permanently removes${transaction.note ? ` "${transaction.note}"` : ' this transaction'}${
          unconfirmed ? ' for every group member' : ''
        }. This cannot be undone.`}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteIt}
      />
    </>
  )
}

export default GroupTransactionModal
