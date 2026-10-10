import { Box, Stack, Tooltip, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useSettlementSide from './useSettlementSide'
import { UserContext } from '../../App'
import { formatFull } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { OnlineContext } from '../../service/OnlineContext'
import { SettlementServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { useToast } from '../shared/ToastProvider'
import { CardAction, CardShell, CardTitleRow, ellipsis } from '../transactions/TransactionCard'

const SettlementCard: FC<{ item: SettlementAugmentedTransaction; onClick?(): void }> = ({ item, onClick }) => {
  const navigate = useNavigate()
  const { privacyMode } = useContext(DrawerContext)
  const { email, authentification_method } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const online = useContext(OnlineContext)
  const { confirmSettlement, refresh: refreshSettlements } = useContext(SettlementServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { showToast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const side = useSettlementSide(item)

  const { settlement } = item
  const group = item.augmentedTransactionGroupData!.transactionGroup
  const nameOf = (memberEmail: string) => group.members.find((m) => m.email === memberEmail)?.name ?? memberEmail
  const awaiting = settlement.payer === settlement.proposedBy ? settlement.receiver : settlement.payer
  const canConfirm = !settlement.completed && settlement.isEnd(email) && settlement.proposedBy !== email
  const isGuest = authentification_method === 'guest'

  const confirm = async () => {
    if (!isGuest) {
      navigate(`/transaction-groups/manage/${group.id}/settle/${settlement.id}/confirm`)
      return
    }
    setConfirming(true)
    try {
      await confirmSettlement(settlement.id, null)
      await Promise.all([refreshSettlements(), refreshTransactions()])
    } catch {
      showToast('Could not confirm the settlement', 'error')
    } finally {
      setConfirming(false)
    }
  }

  const restore = async () => {
    if (side.state === 'missing') {
      navigate(`/transaction-groups/manage/${group.id}/settle/${settlement.id}/record`)
      return
    }
    setConfirming(true)
    try {
      await side.restoreAmount()
      showToast('Your side matches the settlement again')
    } catch {
      showToast('Could not restore your side', 'error')
    } finally {
      setConfirming(false)
    }
  }

  const strip = canConfirm
    ? { action: confirm, color: 'primary.main', label: confirming ? 'Confirming...' : 'Confirm this settlement' }
    : side.state === 'missing'
      ? { action: restore, color: 'warning.main', label: 'Your side is no longer in your transactions. Restore it' }
      : side.state === 'differs'
        ? {
            action: restore,
            color: 'warning.main',
            label: `Your side differs from the settled ${formatFull(item.currency, settlement.amount, privacyMode)}. Restore it`,
          }
        : null

  return (
    <CardShell
      onClick={onClick}
      footer={
        strip && (
          <CardAction
            onClick={strip.action}
            disabled={confirming || !online}
            color={strip.color}
            icon={canConfirm ? <IconLib.MdCheckCircle /> : <IconLib.MdEdit />}
            label={strip.label}
          />
        )
      }
      aside={
        <>
          <Typography variant="body2" fontWeight={500} color={settlement.isEnd(email) ? undefined : 'textDisabled'}>
            {settlement.payer === email ? 'You paid' : settlement.receiver === email ? 'You received' : 'Settlement'}
          </Typography>
          {settlement.isEnd(email) && (
            <Typography variant="body2" fontWeight={700} whiteSpace="nowrap">
              {formatFull(item.currency, settlement.amount, privacyMode)}
            </Typography>
          )}
        </>
      }
    >
      <CardTitleRow
        amount={formatFull(item.currency, settlement.amount, privacyMode)}
        date={formatDate(settlement.date, 'MMM d')}
      />
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} sx={ellipsis}>
          <b>{nameOf(settlement.payer)}</b> paid <b>{nameOf(settlement.receiver)}</b>
        </Typography>
        {settlement.completed && (
          <Tooltip title="Settlement confirmed by both">
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
              <IconLib.MdCheckCircle />
            </Box>
          </Tooltip>
        )}
      </Stack>
      {!settlement.completed && (
        <Typography variant="caption" color="textDisabled">
          Waiting for {awaiting === email ? 'you' : nameOf(awaiting)} to confirm
        </Typography>
      )}
      {settlement.note && (
        <Typography variant="body2" sx={{ minWidth: 0, ...ellipsis }}>
          For: {settlement.note}
        </Typography>
      )}
    </CardShell>
  )
}

export default SettlementCard
