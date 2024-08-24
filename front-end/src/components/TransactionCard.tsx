import { FC } from 'react'

import IconCapsule from './IconCapsule'

interface Props {
  amount: string
  currencySymbol: string
  from: string
  to: string
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
    currencySymbol,
    from,
    to,
    categoryIconName,
    date,
    note,
    categoryIconColor,
    categoryIconBackground,
    onClick,
  } = props

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        background: '#80808010',
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
          <div style={{ fontWeight: 'bold' }}>{amount}</div>
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
            <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>From: {from}</div>
            <div style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>To: {to}</div>
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
