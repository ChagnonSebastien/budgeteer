import { Stack } from '@mui/material'
import { format } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useSettlementSide from './useSettlementSide'
import { UserContext, useGuestView } from '../../App'
import { formatAmount } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { SettlementServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import ConfirmDeleteModal from '../shared/ConfirmDeleteModal'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../shared/FancyModal'
import { useToast } from '../shared/ToastProvider'

const SettlementModal: FC<{ settlement: SettlementAugmentedTransaction; onClose(): void }> = ({
  settlement: item,
  onClose,
}) => {
  const navigate = useNavigate()
  const { email } = useContext(UserContext)
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
  const isGuest = useGuestView()
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
      <FancyDialog open onClose={onClose}>
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
              intent: 'confirm',
              description: isGuest ? 'Agree with this amount' : 'Agree with this amount and record it in your accounts',
              action: () => (isGuest ? confirmAsGuest() : goTo(`${pages}/confirm`)),
              disabled: !canConfirm,
            },
            {
              Icon: IconLib.MdEdit,
              label: 'Edit Settlement',
              intent: 'edit',
              description: 'Propose a different amount, date or note',
              action: () => goTo(`${pages}/edit`),
              disabled: settlement.completed || !isEnd,
            },
            {
              Icon: IconLib.MdInput,
              label: 'Restore my side',
              intent: 'adjust',
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
              intent: 'destructive',
              description: 'Remove this settlement',
              action: () => setConfirmingDelete(true),
              disabled: settlement.completed || !isEnd,
            },
          ]}
        >
          <DetailHeading>DETAILS</DetailHeading>
          <Stack sx={{ gap: 0.5 }}>
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
          </Stack>
        </FancyModal>
      </FancyDialog>

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
