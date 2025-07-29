import {
  addMonths,
  differenceInMonths,
  formatDate,
  isAfter,
  isSameMonth,
  startOfDay,
  subDays,
  subMonths,
} from 'date-fns'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

import TransactionCard from './TransactionCard'
import Category from '../../domain/model/category'
import { formatAmount, formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { DrawerContext } from '../Menu'
import { Column, Row } from '../shared/NoteContainer'

interface Props {
  transactions: AugmentedTransaction[]
  onClick: (transactionId: number) => void
  viewAsAccounts?: number[]
  includeInitialAmounts?: boolean
}

const chunkSize = 100

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

export const TransactionList = (props: Props) => {
  const { transactions, onClick, viewAsAccounts, includeInitialAmounts } = props

  const { state: accounts } = useContext(AccountServiceContext)
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)
  useEffect(() => {
    setDisplayedAmount(chunkSize)
  }, [transactions])

  const viewWithMonthLabels: JSX.Element[] = useMemo(() => {
    if (transactions.length === 0) return []

    const today = startOfDay(new Date())
    const firstTransaction = startOfDay(transactions[transactions.length - 1].date)

    const diffMonths = differenceInMonths(today, firstTransaction)

    const startingFrom = subMonths(today, diffMonths + 1)
    const incrementDate = (from: Date) => addMonths(from, 1)

    let Total = 0
    if (includeInitialAmounts) {
      const iterator = viewAsAccounts?.map((aId) => accounts.find((a) => a.id === aId)!) ?? accounts
      for (const account of iterator) {
        for (const initialAmount of account.initialAmounts) {
          if (initialAmount.currencyId === defaultCurrency.id) {
            Total += initialAmount.value
          } else {
            Total += initialAmount.value * exchangeRateOnDay(initialAmount.currencyId, defaultCurrency.id, startingFrom)
          }
        }
      }
    }

    let upTo = new Date(startingFrom.getFullYear(), startingFrom.getMonth())

    const data = [
      {
        Total,
        date: subDays(upTo, 1),
        diff: 0,
      },
    ]

    let i = transactions.length - 1

    while (!isAfter(upTo, today)) {
      upTo = incrementDate(upTo)
      const lastDayOfPrevMonth = subDays(upTo, 1)
      data.push({ ...data[data.length - 1], date: lastDayOfPrevMonth, diff: 0 })

      while (i >= 0 && isSameMonth(transactions[i].date, lastDayOfPrevMonth)) {
        const transaction = transactions[i]

        if (
          typeof viewAsAccounts === 'undefined'
            ? (transaction.sender?.isMine ?? false)
            : viewAsAccounts.includes(transaction.senderId ?? 0)
        ) {
          let convertedAmount = transaction.amount
          if (transaction.currencyId !== defaultCurrency.id) {
            convertedAmount *= exchangeRateOnDay(transaction.currencyId, defaultCurrency?.id, upTo)
          }
          data[data.length - 1].diff -= convertedAmount
        }
        if (
          typeof viewAsAccounts === 'undefined'
            ? (transaction.receiver?.isMine ?? false)
            : viewAsAccounts.includes(transaction.receiverId ?? 0)
        ) {
          let convertedAmount = transaction.receiverAmount
          if (transaction.receiverCurrencyId !== defaultCurrency.id) {
            convertedAmount *= exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency?.id, upTo)
          }
          data[data.length - 1].diff += convertedAmount
        }

        i -= 1
      }

      data[data.length - 1].Total = data[data.length - 1].Total + data[data.length - 1].diff
    }

    let j = data.length - 1

    const view = []

    const wrap = (data: { Total: number; date: Date; diff: number }) => {
      const { Total, date, diff } = data
      return (
        <Column
          key={`monthly-label-${date.getTime()}`}
          style={{
            alignItems: 'flex-end',
            padding: '1rem',
            paddingBottom: '0.5rem',
          }}
        >
          <div
            style={{
              alignSelf: 'center',
              fontWeight: 'bold',
            }}
          >
            {formatDate(date, 'MMMM yyyy')}
          </div>
          {!privacyMode && (
            <div>
              <Row>{formatFull(defaultCurrency, Total, privacyMode)}</Row>
              {diff !== 0 && (
                <Row
                  style={{
                    color: diff > 0 ? 'var(--ion-color-success)' : 'var(--ion-color-danger)',
                  }}
                >
                  <div>{diff > 0 ? `+` : `-`}</div>
                  <div>{formatAmount(defaultCurrency, Math.abs(diff), privacyMode)}</div>
                </Row>
              )}
            </div>
          )}
        </Column>
      )
    }

    let previousTransactionDate = addMonths(today, 1)
    for (const transaction of transactions) {
      while (j >= 0 && !isSameMonth(previousTransactionDate, transaction.date)) {
        view.push(wrap(data[j]))

        previousTransactionDate = data[j].date
        j -= 1
      }
      view.push(
        <TransactionCard
          key={transaction.id}
          onClick={() => onClick(transaction.id)}
          from={transaction.sender}
          to={transaction.receiver}
          amount={transaction.amount}
          currency={transaction.currency}
          receiverAmount={transaction.receiverAmount}
          receiverCurrency={transaction.receiverCurrency}
          categoryIconName={transaction.category?.iconName ?? defaultCategory.iconName}
          date={transaction.date}
          note={transaction.note ?? ''}
          categoryIconColor={transaction.category?.iconColor ?? defaultCategory.iconColor}
          categoryIconBackground={transaction.category?.iconBackground ?? defaultCategory.iconBackground}
        />,
      )
    }

    view.push(wrap(data[j]))

    return view
  }, [transactions, viewAsAccounts, includeInitialAmounts, privacyMode])

  const displayedItems = useMemo(
    () => viewWithMonthLabels.slice(0, displayedAmount),
    [viewWithMonthLabels, displayedAmount],
  )

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const scrollPosition = scrollTop + clientHeight
      const threshold = scrollHeight - 800 // Load more when 800px from bottom

      if (scrollPosition >= threshold && displayedAmount < viewWithMonthLabels.length) {
        setDisplayedAmount((prevState) => Math.min(prevState + chunkSize, viewWithMonthLabels.length))
      }
    }

    container.addEventListener('scroll', handleScroll)

    // Check initial state in case content is shorter than container
    handleScroll()

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [displayedAmount, viewWithMonthLabels.length])

  return (
    <Column
      ref={containerRef}
      style={{
        position: 'relative',
        margin: 'auto',
        height: '100%',
        gap: '0.2rem',
      }}
    >
      {displayedItems}
    </Column>
  )
}
