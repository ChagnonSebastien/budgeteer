import { Box, Typography } from '@mui/material'
import { FC, memo, useContext, useMemo } from 'react'

import { UserContext } from '../../App'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemProps } from '../accounts/ItemList'
import { DrawerContext } from '../Menu'
import { Column, GradientCard, Row } from '../shared/Layout'

const GroupTransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props

  const { privacyMode } = useContext(DrawerContext)
  const { email } = useContext(UserContext)

  if (item.augmentedTransactionGroupData === null) {
    return <p>Transaction is not part of a group</p>
  }

  const payedBy = item.augmentedTransactionGroupData.transactionGroup.members.find((m) => m.email === item.owner)

  const userContribution = useMemo(() => item.getUserContribution(email), [item.getUserContribution, email])

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
        <Row style={{ justifyContent: 'space-between' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600">
            {formatFull(item.currency, item.amount, privacyMode)}
          </Typography>

          <Box width="2rem" />

          <Typography color="textDisabled" fontSize="0.9rem">
            {item.date.toDateString()}
          </Typography>
        </Row>

        <Row style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
          <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
            Payed by: <span style={{ fontWeight: 'bold' }}>{payedBy?.name ?? item.owner}</span>
          </Typography>
        </Row>

        <Row style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
          <Typography
            fontSize="0.9rem"
            alignSelf="stretch"
            align="right"
            textOverflow="ellipsis"
            flexShrink={4}
            minWidth={0}
            overflow={'hidden'}
          >
            For: {item.note}
          </Typography>
        </Row>
      </Column>
      <Column style={{ alignItems: 'center' }}>
        {userContribution === 0 ? (
          <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
            'Not involved'
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
      </Column>
    </GradientCard>
  )
})

export default GroupTransactionCard
