import { Typography } from '@mui/material'
import { format } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useSettlementSide from './useSettlementSide'
import { UserContext } from '../../App'
import { formatAmount } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { SettlementServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import BasicModal from '../shared/BasicModal'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal'
import { DetailCard, FancyModal } from '../shared/FancyModal'
import { Column } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

const SettlementModal: FC<{ settlement: SettlementAugmentedTransaction; onClose(): void }> = ({
  settlement: item,
  onClose,
}) => {
  const navigate = useNavigate()
  const { email, authentification_method } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const {
    confirmSettlement,
    delete: deleteSettlement,
    refresh: refreshSettlements,
  } = useContext(SettlementServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { showToast } = useToast()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const side = useSettlementSide(item)

  const { settlement } = item
  const group = item.augmentedTransactionGroupData!.transactionGroup
  const nameOf = (memberEmail: string) => group.members.find((m) => m.email === memberEmail)?.name ?? memberEmail
  const isGuest = authentification_method === 'guest'
  const isEnd = settlement.isEnd(email)
  const canConfirm = !settlement.completed && isEnd && settlement.proposedBy !== email
  const pages = `/transaction-groups/manage/${group.id}/settle/${settlement.id}`

  const goTo = (path: string) => {
    onClose()
    navigate(path)
  }

  const refreshAll = () => Promise.all([refreshSettlements(), refreshTransactions()])

  const confirmAsGuest = async () => {
    try {
      await confirmSettlement(settlement.id, null)
      await refreshAll()
      onClose()
    } catch {
      showToast('Could not confirm the settlement', 'error')
    }
  }

  const restoreAmount = async () => {
    try {
      await side.restoreAmount()
      showToast('Your side matches the settlement again')
    } catch {
      showToast('Could not restore your side', 'error')
    }
  }

  const deleteIt = async () => {
    try {
      await deleteSettlement({ id: settlement.id })
      await refreshAll()
      setConfirmingDelete(false)
      onClose()
      showToast('Settlement deleted')
    } catch {
      showToast('Failed to delete settlement', 'error')
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
            topCategory: `${group.name} · Settlement`,
            bigTitle: `${nameOf(settlement.payer)} paid ${nameOf(settlement.receiver)}`,
            bottomSpec: { IconComponent: IconLib.MdCalendarToday, text: format(settlement.date, 'PPP') },
          }}
          bottomMenu={[
            {
              Icon: IconLib.MdCheckCircle,
              label: 'Confirm Settlement',
              color: '#66BB6A',
              description: isGuest ? 'Agree with this amount' : 'Agree with this amount and record it in your accounts',
              action: () => (isGuest ? confirmAsGuest() : goTo(`${pages}/confirm`)),
              disabled: !canConfirm,
            },
            {
              Icon: IconLib.MdEdit,
              label: 'Edit Settlement',
              color: '#64B5F6',
              description: 'Propose a different amount, date or note',
              action: () => goTo(`${pages}/edit`),
              disabled: settlement.completed || !isEnd,
            },
            {
              Icon: IconLib.MdInput,
              label: 'Restore my side',
              color: '#FFB74D',
              description:
                side.state === 'missing'
                  ? 'It is no longer in your transactions: record it again'
                  : 'Your transaction differs from the settled amount: set it back',
              action: () => (side.state === 'missing' ? goTo(`${pages}/record`) : restoreAmount()),
              disabled: side.state === 'ok',
            },
            {
              Icon: IconLib.MdDelete,
              label: 'Delete Settlement',
              color: '#EF5350',
              description: 'Remove this settlement',
              action: () => setConfirmingDelete(true),
              disabled: settlement.completed || !isEnd,
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
              title={item.currency.symbol}
              subTitle={item.currency.name}
              value={formatAmount(item.currency, settlement.amount, privacyMode)}
            />
            {settlement.note && <DetailCard delay={1} title="Note" value={settlement.note} />}
            <DetailCard
              delay={2}
              title="Status"
              value={
                settlement.completed
                  ? 'Confirmed by both'
                  : `Waiting for ${settlement.proposedBy === settlement.payer ? nameOf(settlement.receiver) : nameOf(settlement.payer)}`
              }
            />
          </Column>
        </FancyModal>
      </BasicModal>

      <ConfirmDeleteModal
        open={confirmingDelete}
        title="Delete settlement?"
        description="This removes the settlement for both of you and the transaction you recorded for it. The other person keeps theirs."
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={deleteIt}
      />
    </>
  )
}

export default SettlementModal
