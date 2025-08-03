import { Typography } from '@mui/material'
import { FC, memo, useContext } from 'react'

import Category from '../../domain/model/category'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemProps } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import { DrawerContext } from '../Menu'
import { Column, GradientCard, Row } from '../shared/Layout'

const defaultCategory = new Category(
  0,
  'Transfer Between accounts',
  'GrTransaction',
  'var(--ion-color-dark-contrast)',
  'var(--ion-color-dark)',
  null,
  false,
  0,
)

const TransactionCard: FC<ItemProps<TransactionID, AugmentedTransaction, object>> = memo((props) => {
  const { item, onClick } = props

  const { privacyMode } = useContext(DrawerContext)

  const fromMe = item.sender?.isMine ?? false
  const toMe = item.receiver?.isMine ?? false

  const cardType = fromMe && !toMe ? 'expense' : !fromMe && toMe ? 'income' : ''

  const getBackgroundColor = () => {
    if (cardType === 'expense') return 'rgba(240, 128, 128, 0.05)'
    if (cardType === 'income') return 'rgba(128, 240, 128, 0.05)'
    return 'rgba(128, 128, 128, 0.05)'
  }

  return (
    <GradientCard
      onClick={onClick}
      $selected={false}
      $hoverEffect={false}
      $withGradientBackground={false}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: getBackgroundColor(),
        fontSize: '0.875rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid rgba(128,128,128,0.16)',
        gap: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <IconCapsule
        iconName={item.category?.iconName ?? defaultCategory.iconName}
        size="2.4rem"
        backgroundColor={item.category?.iconBackground ?? defaultCategory.iconBackground}
        color={item.category?.iconColor ?? defaultCategory.iconColor}
      />
      <Column style={{ flexGrow: 1 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600">
            {formatFull(item.currency, item.amount, privacyMode)}

            {item.currency.id !== item.receiverCurrency.id &&
              ` ➜ ${formatFull(item.receiverCurrency, item.receiverAmount, privacyMode)}`}
          </Typography>

          <Typography color="textDisabled" fontSize="0.9rem">
            {item.date.toDateString()}
          </Typography>
        </Row>

        <Row style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
          <Column style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Row style={{ gap: '0.5rem' }}>
              <Typography fontSize="0.9rem" color="textDisabled">
                From:
              </Typography>

              <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
                {item.sender?.name ?? '-'}
              </Typography>
            </Row>

            <Row style={{ gap: '0.5rem' }}>
              <Typography fontSize="0.9rem" color="textDisabled">
                To:
              </Typography>

              <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
                {item.receiver?.name ?? '-'}
              </Typography>
            </Row>
          </Column>

          <Typography
            fontSize="0.9rem"
            alignSelf="stretch"
            align="right"
            textOverflow="ellipsis"
            flexShrink={4}
            minWidth={0}
            overflow={'hidden'}
          >
            {item.note}
          </Typography>
        </Row>
      </Column>
    </GradientCard>
  )
})

export default TransactionCard
