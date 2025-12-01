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
import { CSSProperties, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

import TransactionCard from './TransactionCard'
import { formatAmount, formatFull } from '../../domain/model/currency'
import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { ItemListProps } from '../accounts/ItemList'
import { DrawerContext } from '../Menu'
import { Column, Row } from '../shared/Layout'

const chunkSize = 100

interface AdditionalTransactionListProps {
  onClick: (transactionId: number) => void
  viewAsAccounts?: number[]
  includeInitialAmounts?: boolean
  displayMonthlySummaries?: boolean
  containerStyle?: CSSProperties
}

type Props = ItemListProps<TransactionID, AugmentedTransaction, object> & AdditionalTransactionListProps

export const TransactionList = (props: Props) => {
  const {
    items,
    ItemComponent = TransactionCard,
    onClick,
    viewAsAccounts,
    includeInitialAmounts = false,
    containerStyle,
    displayMonthlySummaries = false,
  } = props

  const { state: accounts } = useContext(AccountServiceContext)
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)
  useEffect(() => {
    setDisplayedAmount(chunkSize)
  }, [items])

  const viewWithMonthLabels: ReactNode[] = useMemo(() => {
    if (items.length === 0) return []

    const today = startOfDay(new Date())
    const firstTransaction = startOfDay(items[items.length - 1].date)

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

    let i = items.length - 1

    while (!isAfter(upTo, today)) {
      upTo = incrementDate(upTo)
      const lastDayOfPrevMonth = subDays(upTo, 1)
      data.push({ ...data[data.length - 1], date: lastDayOfPrevMonth, diff: 0 })

      while (i >= 0 && isSameMonth(items[i].date, lastDayOfPrevMonth)) {
        const transaction = items[i]

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
          {!privacyMode && displayMonthlySummaries && (
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
    for (const transaction of items) {
      while (j >= 0 && !isSameMonth(previousTransactionDate, transaction.date)) {
        view.push(wrap(data[j]))

        previousTransactionDate = data[j].date
        j -= 1
      }
      view.push(<ItemComponent key={transaction.id} item={transaction} onClick={() => onClick(transaction.id)} />)
    }

    view.push(wrap(data[j]))

    return view
  }, [items, viewAsAccounts, includeInitialAmounts, privacyMode])

  const displayedItems = useMemo(
    () => viewWithMonthLabels.slice(0, displayedAmount),
    [viewWithMonthLabels, displayedAmount],
  )

  const loadMoreRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayedAmount((prevState) => Math.min(prevState + chunkSize, viewWithMonthLabels.length))
      }
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [])

  return (
    <Column style={{ position: 'relative', margin: 'auto', gap: '0.4rem', ...containerStyle }}>
      {displayedItems}
      <div
        style={{
          height: '100vh',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: -1,
        }}
        ref={loadMoreRef}
      />
    </Column>
  )
}
