import { IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react'
import { useMemo, useState } from 'react'

import TransactionCard from './TransactionCard'
import Category from '../domain/model/category'
import { formatFull } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'

interface Props {
  transactions: AugmentedTransaction[]
  onClick: (transactionId: number) => void
}

const chunkSize = 50

const defaultCategory = new Category(
  0,
  'Transfer Between accounts',
  'GrTransaction',
  'var(--ion-color-dark-contrast)',
  'var(--ion-color-dark)',
  null,
)

export const TransactionList = (props: Props) => {
  const { transactions, onClick } = props

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)

  const displayedItems = useMemo(() => transactions.slice(0, displayedAmount), [transactions, displayedAmount])

  return (
    <>
      {displayedItems.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          onClick={() => onClick(transaction.id)}
          from={transaction.sender?.name ?? '-'}
          to={transaction.receiver?.name ?? '-'}
          amount={formatFull(transaction.currency, transaction.amount)}
          categoryIconName={transaction.category?.iconName ?? defaultCategory.iconName}
          date={transaction.date}
          currencySymbol={transaction.currency.symbol}
          note={transaction.note ?? ''}
          categoryIconColor={transaction.category?.iconColor ?? defaultCategory.iconColor}
          categoryIconBackground={transaction.category?.iconBackground ?? defaultCategory.iconBackground}
        />
      ))}
      <IonInfiniteScroll
        onIonInfinite={(ev) => {
          setDisplayedAmount((prevState) => prevState + chunkSize)
          setTimeout(() => ev.target.complete(), 500)
        }}
      >
        <IonInfiniteScrollContent></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </>
  )
}
