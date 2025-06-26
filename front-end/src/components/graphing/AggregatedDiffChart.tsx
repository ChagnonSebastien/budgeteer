import { Card } from '@mui/material'
import { Datum, ResponsiveLine } from '@nivo/line'
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  formatDate,
  isBefore,
  isSameDay,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'

import '../../styles/graphs-tailwind.css'

interface Props {
  transactions: AugmentedTransaction[]
  fromDate: Date
  toDate: Date
  hideFinancialIncome?: boolean
}

const AggregatedDiffChart: FC<Props> = (props) => {
  const { fromDate, toDate, transactions } = props

  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { exchangeRateOnDay } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  return useMemo(() => {
    if (defaultCurrency === null) return null

    const diffDays = differenceInDays(toDate, fromDate)
    const diffWeeks = differenceInWeeks(toDate, fromDate)
    const diffMonths = differenceInMonths(toDate, fromDate)

    let subN = subDays
    let showLabelEveryFactor = 2
    let i = diffDays + 1

    if (diffMonths > 72) {
      // Tick every 2 months, label every year
      subN = (date, i) => subMonths(date, i * 2)
      showLabelEveryFactor = 6
      i = Math.floor(diffMonths / 2) + 1
    } else if (diffMonths > 36) {
      // Tick every month, label every 6 months
      subN = subMonths
      showLabelEveryFactor = 6
      i = diffMonths + 1
    } else if (diffMonths > 24) {
      // Tick every month, label every 3 months
      subN = subMonths
      showLabelEveryFactor = 3
      i = diffMonths + 1
    } else if (diffWeeks > 20) {
      // Tick every week, label every 4 weeks
      subN = subWeeks
      showLabelEveryFactor = 4
      i = diffWeeks + 1
    } else if (diffDays > 50) {
      // Tick every day, label every week
      subN = subDays
      showLabelEveryFactor = 7
      i = diffDays + 1
    }

    let transactionIndex = transactions.length - 1
    const data: Datum[] = []
    const labels: string[] = []

    while (i >= 0) {
      const upTo = subN(toDate, i)
      labels.push(formatDate(upTo, 'MMM d, yyyy'))
      data.push({ x: data.length, y: data.length === 0 ? 0 : data[data.length - 1].y })

      while (
        transactionIndex >= 0 &&
        (isBefore(transactions[transactionIndex].date, upTo) || isSameDay(transactions[transactionIndex].date, upTo))
      ) {
        const t = transactions[transactionIndex]
        if (isBefore(t.date, fromDate) && !isSameDay(t.date, fromDate)) {
          transactionIndex -= 1
          continue
        } else if (typeof t.category === 'undefined') {
          transactionIndex -= 1
          continue
        }

        if (props.hideFinancialIncome && t.category.name === 'Financial income') {
          transactionIndex -= 1
          continue
        }

        if (t.sender?.isMine ?? false) {
          let amount = t.amount
          if (t.currencyId !== defaultCurrency.id) {
            amount *= exchangeRateOnDay(t.currencyId, defaultCurrency!.id, t.date)
          }

          data[data.length - 1].y = (data[data.length - 1].y as number) - amount
        }
        if (t.receiver?.isMine ?? false) {
          let amount = t.receiverAmount
          if (t.receiverCurrencyId !== defaultCurrency.id) {
            amount *= exchangeRateOnDay(t.receiverCurrencyId, defaultCurrency!.id, t.date)
          }
          data[data.length - 1].y = (data[data.length - 1].y as number) + amount
        }
        transactionIndex -= 1
      }
      i -= 1
    }

    return (
      <>
        <ResponsiveLine
          data={[{ id: 'Diff', data }]}
          margin={{ top: 20, right: 25, bottom: 80, left: 60 }}
          axisBottom={{
            format: (i) =>
              (data.length - i - 1) % showLabelEveryFactor === 0
                ? labels[i] && formatDate(labels[i], 'MMM d, yyyy')
                : '',
            tickRotation: -45,
          }}
          enableGridY={!privacyMode}
          xFormat={(i) => labels[i as number] && formatDate(labels[i as number], 'MMM d, yyyy')}
          axisLeft={{
            tickSize: privacyMode ? 0 : 5,
            format: (i) =>
              privacyMode
                ? ''
                : ((i as number) / Math.pow(10, defaultCurrency?.decimalPoints)).toLocaleString(undefined, {
                    notation: 'compact',
                  }),
          }}
          yFormat={(n) => formatFull(defaultCurrency, n as number, privacyMode)}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
          }}
          tooltip={(props) => {
            return (
              <Card>
                <div className="p-2 flex flex-col items-center">
                  <div className="font-bold">{props.point.data.xFormatted}</div>
                  {!privacyMode && <div>{props.point.data.yFormatted}</div>}
                </div>
              </Card>
            )
          }}
          isInteractive
          useMesh
          curve="monotoneX"
          theme={darkTheme}
          colors={darkColors}
          animate={false}
        />
      </>
    )
  }, [defaultCurrency, transactions, fromDate, toDate, privacyMode])
}

export default AggregatedDiffChart
