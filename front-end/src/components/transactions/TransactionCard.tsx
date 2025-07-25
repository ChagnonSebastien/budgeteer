import { FC, memo, useContext } from 'react'

import Account from '../../domain/model/account'
import Currency, { formatFull } from '../../domain/model/currency'
import IconCapsule from '../icons/IconCapsule'
import { DrawerContext } from '../Menu'

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
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: getBackgroundColor(),
        borderRadius: '0.75rem',
        fontSize: '0.875rem',
        margin: '0.3rem',
        padding: '0.5rem 0.75rem',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        cursor: 'pointer',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <IconCapsule
          iconName={categoryIconName}
          size="2.4rem"
          backgroundColor={categoryIconBackground}
          color={categoryIconColor}
        />
      </div>
      <div style={{ width: '0.5rem', flexShrink: 0 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyItems: 'stretch',
          flexGrow: 1,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              letterSpacing: '0.01em',
              fontSize: '0.95rem',
            }}
          >
            {formatFull(currency, amount, privacyMode)}
            {currency.id === receiverCurrency.id
              ? ''
              : ` -> ${formatFull(receiverCurrency, receiverAmount, privacyMode)}`}
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.85rem',
            }}
          >
            {date.toDateString()}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>From:</span>{' '}
              <span style={{ fontWeight: 500 }}>{from?.name ?? '-'}</span>
            </div>
            <div
              style={{
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>To:</span>{' '}
              <span style={{ fontWeight: 500 }}>{to?.name ?? '-'}</span>
            </div>
          </div>

          <div
            style={{
              whiteSpace: 'normal',
              textOverflow: 'ellipsis',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.85rem',
              textAlign: 'end',
            }}
          >
            {note}
          </div>
        </div>
      </div>
    </div>
  )
})

TransactionCard.displayName = 'TransactionCard'

export default TransactionCard
