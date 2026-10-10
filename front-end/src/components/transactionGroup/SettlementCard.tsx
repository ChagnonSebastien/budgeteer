import { Box, ButtonBase, Tooltip, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useSettlementSide from './useSettlementSide'
import { UserContext } from '../../App'
import { formatFull } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { SettlementServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { Column, GradientCard, Row } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

const SettlementCard: FC<{ item: SettlementAugmentedTransaction; onClick?(): void }> = ({ item, onClick }) => {
  const navigate = useNavigate()
  const { privacyMode } = useContext(DrawerContext)
  const { email, authentification_method } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
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

  const card = (
    <GradientCard
      onClick={onClick}
      $selected={false}
      $hoverEffect={false}
      $withGradientBackground={false}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(128,128,128,0.08)',
        fontSize: '0.875rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid rgba(128,128,128,0.16)',
        gap: '0.75rem',
      }}
    >
      <Column style={{ flexGrow: 1, minWidth: 0 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600" whiteSpace="nowrap">
            {formatFull(item.currency, settlement.amount, privacyMode)}
          </Typography>
          <Typography color="textDisabled" fontSize="0.9rem" whiteSpace="nowrap">
            {formatDate(settlement.date, 'MMM d')}
          </Typography>
        </Row>
        <Row style={{ alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
          <Typography fontSize="0.9rem" fontWeight="500" textOverflow="ellipsis" overflow="hidden">
            <b>{nameOf(settlement.payer)}</b> paid <b>{nameOf(settlement.receiver)}</b>
          </Typography>
          {settlement.completed && (
            <Tooltip title="Settlement confirmed by both">
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <IconLib.MdCheckCircle />
              </Box>
            </Tooltip>
          )}
        </Row>
        {!settlement.completed && (
          <Typography fontSize="0.8rem" color="textDisabled">
            Waiting for {awaiting === email ? 'you' : nameOf(awaiting)} to confirm
          </Typography>
        )}
        {settlement.note && (
          <Typography fontSize="0.9rem" textOverflow="ellipsis" minWidth={0} overflow="hidden">
            For: {settlement.note}
          </Typography>
        )}
      </Column>
      <Column style={{ alignItems: 'center', textAlign: 'center', width: '6.5rem', flexShrink: 0 }}>
        <Typography fontSize="0.9rem" fontWeight="500" color={settlement.isEnd(email) ? undefined : 'textDisabled'}>
          {settlement.payer === email ? 'You paid' : settlement.receiver === email ? 'You received' : 'Settlement'}
        </Typography>
        {settlement.isEnd(email) && (
          <Typography fontSize="0.9rem" fontWeight="bold" whiteSpace="nowrap">
            {formatFull(item.currency, settlement.amount, privacyMode)}
          </Typography>
        )}
      </Column>
    </GradientCard>
  )

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

  if (strip === null) return card

  return (
    <Column
      style={{
        backgroundColor: 'rgba(128,128,128,.16)',
        border: '1px solid rgba(128,128,128,0.16)',
        borderRadius: '0.5rem',
      }}
    >
      {card}
      <ButtonBase
        onClick={strip.action}
        disabled={confirming}
        sx={{
          gap: '0.35rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '0 0 0.5rem 0.5rem',
          color: strip.color,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        {canConfirm ? <IconLib.MdCheckCircle /> : <IconLib.MdEdit />}
        <Typography fontSize="0.9rem" fontWeight="500">
          {strip.label}
        </Typography>
      </ButtonBase>
    </Column>
  )
}

export default SettlementCard
