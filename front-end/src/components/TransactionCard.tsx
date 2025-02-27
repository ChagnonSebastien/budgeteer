import { FC, useContext, memo } from 'react'

import IconCapsule from './IconCapsule'
import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import Currency, { formatFull } from '../domain/model/currency'

import '../styles/transaction-list-tailwind.css'

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

  return (
    <div onClick={onClick} className={`transaction-card ${cardType}`}>
      <div className="transaction-card-icon">
        <IconCapsule
          iconName={categoryIconName}
          size="2.4rem"
          backgroundColor={categoryIconBackground}
          color={categoryIconColor}
        />
      </div>
      <div className="transaction-card-spacer" />
      <div className="transaction-card-content">
        <div className="transaction-card-header">
          <div className="transaction-card-amount">
            {formatFull(currency, amount, privacyMode)}
            {currency.id === receiverCurrency.id
              ? ''
              : ` -> ${formatFull(receiverCurrency, receiverAmount, privacyMode)}`}
          </div>
          <div className="transaction-card-date">{date.toDateString()}</div>
        </div>
        <div className="transaction-card-details">
          <div className="transaction-card-accounts">
            <div className="transaction-card-account">
              <span className="transaction-card-account-label">From:</span>{' '}
              <span className="transaction-card-account-name">{from?.name ?? '-'}</span>
            </div>
            <div className="transaction-card-account">
              <span className="transaction-card-account-label">To:</span>{' '}
              <span className="transaction-card-account-name">{to?.name ?? '-'}</span>
            </div>
          </div>

          <div className="transaction-card-note">{note}</div>
        </div>
      </div>
    </div>
  )
})

TransactionCard.displayName = 'TransactionCard'

export default TransactionCard
