import { Box, Button, Tooltip, Typography } from '@mui/material'
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

  return (
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
        gap: '2rem',
        overflowX: 'auto',
      }}
    >
      <Column style={{ flexGrow: 1 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600">
            {formatFull(item.currency, item.amount, privacyMode)}
          </Typography>

          <Box width="2rem" />

          <Typography color="textDisabled" fontSize="0.9rem">
            {item.date.toDateString()}
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
      <Column style={{ alignItems: 'center' }}>
        {userContribution === 0 ? (
          <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
            Not involved
          </Typography>
        ) : (
          <>
            <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
              {userContribution > 0 ? 'You lent to the group' : 'You owe to the group'}
            </Typography>
            <Typography fontSize="0.9rem" fontWeight="bold" textOverflow={'ellipsis'} overflow={'hidden'}>
              {formatFull(item.augmentedTransactionGroupData.transactionGroup.augmentedCurrency, userContribution)}
            </Typography>
          </>
        )}
        {isUnconfirmed && !isGuest && item.owner === email && (
          <Button
            size="small"
            variant="text"
            sx={{ mt: '0.25rem', py: 0, minHeight: 0, textTransform: 'none' }}
            onClick={(e) => {
              e.stopPropagation()
              navigate(
                `/transaction-groups/manage/${item.unconfirmed.transactionGroupId}/unconfirmed/${item.unconfirmed.id}/promote`,
              )
            }}
          >
            Add to mine
          </Button>
        )}
      </Column>
    </GradientCard>
  )
})

export default GroupTransactionCard
