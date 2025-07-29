import { Typography } from '@mui/material'
import { FC, memo, useContext } from 'react'

import Account from '../../domain/model/account'
import Currency, { formatFull } from '../../domain/model/currency'
import IconCapsule from '../icons/IconCapsule'
import { DrawerContext } from '../Menu'
import { Column, GradientCard, Row } from '../shared/NoteContainer'

interface Props {
  amount: number
  currency: Currency
  receiverAmount: number
  receiverCurrency: Currency
  from?: Account
  to?: Account
  categoryIconName: string
  categoryIconColor: string
  categoryIconBackground: string
  date: Date
  note: string
  onClick: () => void
}

const TransactionCard: FC<Props> = memo((props) => {
  const {
    amount,
    currency,
    receiverAmount,
    receiverCurrency,
    from,
    to,
    categoryIconName,
    date,
    note,
    categoryIconColor,
    categoryIconBackground,
    onClick,
  } = props

  const { privacyMode } = useContext(DrawerContext)

  const fromMe = from?.isMine ?? false
  const toMe = to?.isMine ?? false

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
      $withGradientBackground={false}
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: getBackgroundColor(),
        fontSize: '0.875rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        gap: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <IconCapsule
        iconName={categoryIconName}
        size="2.4rem"
        backgroundColor={categoryIconBackground}
        color={categoryIconColor}
        flexShrink={0}
      />
      <Column style={{ flexGrow: 1 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Typography letterSpacing="0.01rem" fontSize="0.95rem" fontWeight="600">
            {formatFull(currency, amount, privacyMode)}

            {currency.id !== receiverCurrency.id && ` ➜ ${formatFull(receiverCurrency, receiverAmount, privacyMode)}`}
          </Typography>

          <Typography color="textDisabled" fontSize="0.9rem">
            {date.toDateString()}
          </Typography>
        </Row>

        <Row style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
          <Column style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Row style={{ gap: '0.5rem' }}>
              <Typography fontSize="0.9rem" color="textDisabled">
                From:
              </Typography>

              <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
                {from?.name ?? '-'}
              </Typography>
            </Row>

            <Row style={{ gap: '0.5rem' }}>
              <Typography fontSize="0.9rem" color="textDisabled">
                To:
              </Typography>

              <Typography fontSize="0.9rem" fontWeight="500" textOverflow={'ellipsis'} overflow={'hidden'}>
                {to?.name ?? '-'}
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
            {note}
          </Typography>
        </Row>
      </Column>
    </GradientCard>
  )
})

TransactionCard.displayName = 'TransactionCard'

export default TransactionCard
