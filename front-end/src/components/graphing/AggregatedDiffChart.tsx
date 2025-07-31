import { Card } from '@mui/material'
import { Datum, ResponsiveLine } from '@nivo/line'
import { formatDate, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

interface Props {
  transactions: AugmentedTransaction[]
  fromDate: Date
  toDate: Date
  hideFinancialIncome?: boolean
}

const AggregatedDiffChart: FC<Props> = (props) => {
  const { fromDate, toDate, transactions } = props

  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const { hop: subN, showLabelEveryFactor, amountHop } = useTimerangeSegmentation(fromDate, toDate)

  return useMemo(() => {
    let i = amountHop

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
                : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
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
  }, [defaultCurrency, transactions, fromDate, toDate, privacyMode, amountHop, showLabelEveryFactor, subN])
}

export default AggregatedDiffChart
