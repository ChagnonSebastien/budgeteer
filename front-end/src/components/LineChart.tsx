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

import { formatAmount, formatFull } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import { CurrencyServiceContext } from '../service/ServiceContext'

interface Props {
  augmentedTransactions: AugmentedTransaction[]
}

const TransactionsLineChart: FC<Props> = (props) => {
  const { augmentedTransactions } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)

  const stream = useMemo(() => {
    const today = new Date()
    const firstTransaction = augmentedTransactions[augmentedTransactions.length - 1].date

    const diffDays = differenceInDays(today, firstTransaction)
    const diffWeeks = differenceInWeeks(today, firstTransaction)
    const diffMonths = differenceInMonths(today, firstTransaction)
    const diffYears = differenceInYears(today, firstTransaction)

    let startingFrom = subDays(firstTransaction, 1)
    let incrementDate = (from: Date) => addDays(from, 1)
    let showLabelEveryFactor = 1

    if (diffMonths > 50) {
      startingFrom = subYears(today, diffYears + 1)
      incrementDate = (from: Date) => addMonths(from, 1)
      showLabelEveryFactor = 12
    } else if (diffWeeks > 50) {
      startingFrom = subWeeks(today, diffWeeks + 1)
      incrementDate = (from: Date) => addWeeks(from, 1)
      showLabelEveryFactor = 4
    } else if (diffDays > 50) {
      startingFrom = subWeeks(today, diffWeeks + 1)
      incrementDate = (from: Date) => addDays(from, 1)
      showLabelEveryFactor = 7
    }

    const data = [
      {
        Total: 0,
      },
    ]

    const keys = [startingFrom]

    let upTo = startingFrom
    let i = augmentedTransactions.length - 1

    while (!isSameDay(upTo, today)) {
      upTo = incrementDate(upTo)
      keys.push(upTo)
      data.push({ ...data[data.length - 1] })

      while (i >= 0 && (isBefore(augmentedTransactions[i].date, upTo) || isSameDay(today, upTo))) {
        if (augmentedTransactions[i].sender?.isMine ?? false) {
          data[data.length - 1].Total -= augmentedTransactions[i].amount
        }
        if (augmentedTransactions[i].receiver?.isMine ?? false) {
          data[data.length - 1].Total += augmentedTransactions[i].receiverAmount
        }
        i -= 1
      }
    }

    return (
      <div style={{ height: '30rem' }}>
        <ResponsiveStream
          data={data}
          keys={['Total']}
          valueFormat={(value) => `${formatFull(defaultCurrency, value)}`}
          margin={{ top: 20, right: 20, bottom: 100, left: 80 }}
          axisBottom={{
            format: (i) => (i % showLabelEveryFactor === 0 ? formatDate(keys[i], 'MMM d, yyyy') : ''),
            tickRotation: -45,
          }}
          axisLeft={{
            format: (i) => `${formatAmount(defaultCurrency, i)}`,
          }}
          curve="linear"
          offsetType="diverging"
          colors={{ scheme: 'set3' }}
          borderColor={{ theme: 'background' }}
          stackTooltip={(tooltipProps) => (
            <IonCard style={{ padding: '0.5rem' }}>
              <div>{formatDate(keys[tooltipProps.slice.index], 'MMM d, yyyy')}</div>
              {tooltipProps.slice.stack.map((s) => (
                <div
                  key={`line-chart-overlay-${formatDate(keys[tooltipProps.slice.index], 'MMM d, yyyy')}-${s.layerLabel}`}
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
      </div>
    )
  }, [augmentedTransactions, defaultCurrency])

  return <>{stream}</>
}

export default TransactionsLineChart
