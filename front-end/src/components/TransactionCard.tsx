import { FC, useContext } from 'react'

import IconCapsule from './IconCapsule'
import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import Currency, { formatFull } from '../domain/model/currency'

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

const TransactionCard: FC<Props> = (props) => {
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

  let gradientColors = ['rgba(128, 128, 128, 0.05)', 'rgba(128, 128, 128, 0.02)']
  if (fromMe && !toMe) {
    gradientColors = ['rgba(240, 128, 128, 0.05)', 'rgba(240, 128, 128, 0.02)']
  } else if (!fromMe && toMe) {
    gradientColors = ['rgba(128, 240, 128, 0.05)', 'rgba(128, 240, 128, 0.02)']
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background: `linear-gradient(145deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
        borderRadius: '12px',
        fontSize: 'small',
        textWrap: 'nowrap',
        margin: '.3rem',
        padding: '.5rem .75rem',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 12px -4px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.005)'
        e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(0, 0, 0, 0.2)'
        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = '0 2px 12px -4px rgba(0, 0, 0, 0.15)'
        e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)'
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
      <div style={{ width: '.5rem', flexShrink: 0 }} />
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
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <div
            style={{
              fontWeight: '600',
              letterSpacing: '0.01em',
              fontSize: '0.95rem',
            }}
          >
            {formatFull(currency, amount, privacyMode)}
            {currency.id === receiverCurrency.id
              ? ``
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
              <span style={{ fontWeight: '500' }}>{from?.name ?? '-'}</span>
            </div>
            <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>To:</span>{' '}
              <span style={{ fontWeight: '500' }}>{to?.name ?? '-'}</span>
            </div>
          </div>

          <div
            style={{
              whiteSpace: 'wrap',
              textOverflow: 'ellipsis',
              fontWeight: '300',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.85rem',
              textWrap: 'wrap',
              textAlign: 'end',
            }}
          >
            {note}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionCard
