import { FC } from 'react'

import IconCapsule from './IconCapsule'
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

  const fromMe = from?.isMine ?? false
  const toMe = to?.isMine ?? false

  let background = '#80808020'
  if (fromMe && !toMe) {
    background = '#F0808020'
  } else if (!fromMe && toMe) {
    background = '#80F08020'
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background,
        borderRadius: '.3rem',
        fontSize: 'small',
        textWrap: 'nowrap',
        margin: '.3rem',
        padding: '.3rem .5rem',
        alignItems: 'center',
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
          <div style={{ fontWeight: 'bold' }}>
            {formatFull(currency, amount)}
            {currency.id === receiverCurrency.id ? `` : ` -> ${formatFull(receiverCurrency, receiverAmount)}`}
          </div>
          <div>{date.toDateString()}</div>
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
              From: {from?.name ?? '-'}
            </div>
            <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              To: {to?.name ?? '-'}
            </div>
          </div>

          <div
            style={{
              whiteSpace: 'wrap',
              textOverflow: 'ellipsis',
              fontWeight: 'lighter',
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
