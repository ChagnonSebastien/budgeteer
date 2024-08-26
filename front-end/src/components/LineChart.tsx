import { IonCard } from '@ionic/react'
import { ResponsiveStream } from '@nivo/stream'
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
  formatDate,
  isBefore,
  isSameDay,
  subDays,
  subWeeks,
  subYears,
} from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatFull } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

interface Props {
  augmentedTransactions: AugmentedTransaction[]
  viewAsAccounts?: number[]
  includeInitialAmounts?: boolean
}

const TransactionsLineChart: FC<Props> = (props) => {
  const { augmentedTransactions, viewAsAccounts, includeInitialAmounts = false } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { exchangeRateOnDay } = useContext(MixedAugmentation)
  const { state: acounts } = useContext(AccountServiceContext)

  const stream = useMemo(() => {
    if (defaultCurrency === null) return null
    if (augmentedTransactions.length === 0) return null

    const today = new Date()
    const firstTransaction = augmentedTransactions[augmentedTransactions.length - 1].date

    const diffDays = differenceInDays(today, firstTransaction)
    const diffWeeks = differenceInWeeks(today, firstTransaction)
    const diffMonths = differenceInMonths(today, firstTransaction)
    const diffYears = differenceInYears(today, firstTransaction)

    let startingFrom = subDays(firstTransaction, 1)
    let incrementDate = (from: Date) => addDays(from, 1)
    let showLabelEveryFactor = 1

    if (diffMonths > 72) {
      startingFrom = subYears(today, diffYears + 1)
      incrementDate = (from: Date) => addMonths(from, 1)
      showLabelEveryFactor = 12
    } else if (diffMonths > 36) {
      startingFrom = subYears(today, diffYears + 1)
      incrementDate = (from: Date) => addMonths(from, 1)
      showLabelEveryFactor = 6
    } else if (diffWeeks > 50) {
      startingFrom = subWeeks(today, diffWeeks + 1)
      incrementDate = (from: Date) => addWeeks(from, 1)
      showLabelEveryFactor = 4
    } else if (diffDays > 50) {
      startingFrom = subWeeks(today, diffWeeks + 1)
      incrementDate = (from: Date) => addDays(from, 1)
      showLabelEveryFactor = 7
    }

    let Total = 0
    if (includeInitialAmounts) {
      const iterator = viewAsAccounts?.map((aId) => acounts.find((a) => a.id === aId)!) ?? acounts
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

    const data = [
      {
        Total,
        Investments: 0,
      },
    ]

    const keys = [startingFrom]

    let upTo = startingFrom
    let i = augmentedTransactions.length - 1

    const investments = new Map<number, number>()
    let totalInvested = 0

    while (!isSameDay(upTo, today)) {
      upTo = incrementDate(upTo)
      keys.push(upTo)
      data.push({ ...data[data.length - 1] })

      while (i >= 0 && (isBefore(augmentedTransactions[i].date, upTo) || isSameDay(today, upTo))) {
        const transaction = augmentedTransactions[i]

        // Investments incomes (such as dividends) should be marked as Investments such and not as raw incomes
        // Same thing for investments costs
        if (
          (transaction.receiverCurrencyId === defaultCurrency?.id || (transaction.sender?.isMine ?? false)) &&
          (transaction.currencyId === defaultCurrency?.id || (transaction.receiver?.isMine ?? false))
        ) {
          if (
            typeof viewAsAccounts === 'undefined'
              ? (transaction.sender?.isMine ?? false)
              : viewAsAccounts.includes(transaction.senderId ?? 0)
          ) {
            let convertedAmount = transaction.amount
            if (transaction.currencyId !== defaultCurrency.id) {
              convertedAmount *= exchangeRateOnDay(transaction.currencyId, defaultCurrency?.id, upTo)
            }
            data[data.length - 1].Total -= convertedAmount
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
            data[data.length - 1].Total += convertedAmount
          }
        }

        if (
          transaction.categoryId === null ||
          (transaction.currencyId !== defaultCurrency?.id && (transaction.sender?.isMine ?? false)) ||
          (transaction.receiverCurrencyId !== defaultCurrency.id && (transaction.receiver?.isMine ?? false))
        ) {
          // Transfer
          if (transaction.currencyId === defaultCurrency?.id) {
            if (
              transaction.receiverCurrencyId !== defaultCurrency.id &&
              (transaction.sender?.isMine ?? false) &&
              (typeof viewAsAccounts === 'undefined' || viewAsAccounts.includes(transaction.receiverId ?? 0))
            ) {
              totalInvested += transaction.amount
            }
          } else if (
            transaction.receiverCurrencyId === defaultCurrency?.id &&
            (typeof viewAsAccounts === 'undefined' || viewAsAccounts.includes(transaction.senderId ?? 0))
          ) {
            investments.set(transaction.currencyId, (investments.get(transaction.currencyId) ?? 0) - transaction.amount)
          }

          if (transaction.receiverCurrencyId === defaultCurrency?.id) {
            if (
              transaction.currencyId !== defaultCurrency.id &&
              (transaction.receiver?.isMine ?? false) &&
              (typeof viewAsAccounts === 'undefined' || viewAsAccounts.includes(transaction.senderId ?? 0))
            ) {
              totalInvested -= transaction.receiverAmount
            }
          } else if (
            transaction.currencyId === defaultCurrency?.id &&
            (typeof viewAsAccounts === 'undefined' || viewAsAccounts.includes(transaction.receiverId ?? 0))
          ) {
            investments.set(
              transaction.receiverCurrencyId,
              (investments.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
            )
          }
        }
        i -= 1
      }

      let portfolioValue = 0
      for (const [currencyId, amountOfShares] of investments) {
        portfolioValue += amountOfShares * exchangeRateOnDay(currencyId, defaultCurrency?.id, upTo)
      }

      data[data.length - 1].Investments = portfolioValue - totalInvested
    }

    return (
      <ResponsiveStream
        data={data}
        keys={['Total', 'Investments']}
        valueFormat={(value) => `${formatFull(defaultCurrency, value)}`}
        margin={{ top: 10, right: 20, bottom: 60, left: 60 }}
        axisBottom={{
          format: (i) => (i % showLabelEveryFactor === 0 ? keys[i] && formatDate(keys[i], 'MMM d, yyyy') : ''),
          tickRotation: -45,
        }}
        axisLeft={{
          format: (i) =>
            ((i as number) / Math.pow(10, defaultCurrency?.decimalPoints)).toLocaleString(undefined, {
              notation: 'compact',
            }),
        }}
        curve="monotoneX"
        offsetType="diverging"
        colors={{ scheme: 'set3' }}
        borderColor={{ theme: 'background' }}
        stackTooltip={(tooltipProps) => (
          <IonCard style={{ padding: '0.5rem' }}>
            <div>{formatDate(keys[tooltipProps.slice.index], 'MMM d, yyyy')}</div>
            {tooltipProps.slice.stack.map((s) => (
              <div
                key={`line-chart-overlay-${keys[tooltipProps.slice.index] && formatDate(keys[tooltipProps.slice.index], 'MMM d, yyyy')}-${s.layerLabel}`}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <div
                  style={{
                    width: '1rem',
                    height: '1rem',
                    backgroundColor: s.color,
                    borderRadius: '.25rem',
                    marginRight: '.25rem',
                  }}
                ></div>
                {s.layerLabel}: {s.formattedValue}
              </div>
            ))}
          </IonCard>
        )}
      />
    )
  }, [augmentedTransactions, defaultCurrency])

  return <>{stream}</>
}

export default TransactionsLineChart
