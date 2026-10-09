import { Box, ButtonBase, Tooltip, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, memo, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext } from '../../App'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import { ItemProps } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { Column, GradientCard, Row } from '../shared/Layout'

const GroupTransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props

  const { privacyMode } = useContext(DrawerContext)
  const { email, authentification_method } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const navigate = useNavigate()
  const isGuest = authentification_method === 'guest'

  const userContribution = useMemo(() => item.getUserContribution(email), [item, email])

  if (item.augmentedTransactionGroupData === null) {
    return <p>Transaction is not part of a group</p>
  }

  const payedBy = item.augmentedTransactionGroupData.transactionGroup.members.find((m) => m.email === item.owner)
  const isUnconfirmed = item instanceof UnconfirmedAugmentedTransaction
  const promotable =
    item instanceof UnconfirmedAugmentedTransaction && !isGuest && item.owner === email ? item.unconfirmed : null

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
        overflowX: 'auto',
      }}
    >
      <Column style={{ flexGrow: 1 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600" whiteSpace="nowrap">
            {formatFull(item.currency, item.amount, privacyMode)}
          </Typography>
          <Typography color="textDisabled" fontSize="0.9rem" whiteSpace="nowrap">
            {formatDate(item.date, 'MMM d')}
          </Typography>
        </Row>

        <Row style={{ alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
          <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
            Payed by: <span style={{ fontWeight: 'bold' }}>{payedBy?.name ?? item.owner}</span>
          </Typography>
          {!isUnconfirmed && (
            <Tooltip
              title={
                item.owner === email
                  ? 'Confirmed, it is part of your transactions'
                  : 'Confirmed by the payer, it can no longer be edited'
              }
            >
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <IconLib.MdCheckCircle />
              </Box>
            </Tooltip>
          )}
        </Row>

        {item.note && (
          <Typography fontSize="0.9rem" textOverflow="ellipsis" minWidth={0} overflow={'hidden'}>
            For: {item.note}
          </Typography>
        )}
      </Column>
      <Column style={{ alignItems: 'center', textAlign: 'center', width: '6.5rem', flexShrink: 0 }}>
        {userContribution === 0 ? (
          <Typography fontSize="0.9rem" fontWeight="500" color="textDisabled">
            Not involved
          </Typography>
        ) : (
          <>
            <Typography fontSize="0.9rem" fontWeight="500">
              {userContribution > 0 ? 'You lent' : 'You owe'}
            </Typography>
            <Typography fontSize="0.9rem" fontWeight="bold" whiteSpace="nowrap">
              {formatFull(
                item.augmentedTransactionGroupData.transactionGroup.augmentedCurrency,
                Math.abs(userContribution),
                privacyMode,
              )}
            </Typography>
          </>
        )}
      </Column>
    </GradientCard>
  )

  if (promotable === null) return card

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
        onClick={() =>
          navigate(`/transaction-groups/manage/${promotable.transactionGroupId}/unconfirmed/${promotable.id}/promote`)
        }
        sx={{
          gap: '0.35rem',
          padding: '0.25rem',
          borderRadius: '0 0 0.5rem 0.5rem',
          color: 'primary.main',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <IconLib.BsPlusCircle />
        <Typography fontSize="0.9rem" fontWeight="500">
          Confirm and add to my transactions
        </Typography>
      </ButtonBase>
    </Column>
  )
})

export default GroupTransactionCard
