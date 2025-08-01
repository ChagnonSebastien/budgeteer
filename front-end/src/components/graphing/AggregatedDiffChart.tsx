import { Card } from '@mui/material'
import { AllowedValue, ResponsiveLine } from '@nivo/line'
import { formatDate } from 'date-fns'
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
  const { fromDate, toDate, transactions, hideFinancialIncome } = props

  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const { showLabelEveryFactor, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate)

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(transactions),
    [timeseriesIteratorGenerator, transactions],
  )

  return useMemo(() => {
    const data: {
      x: AllowedValue
      y: AllowedValue
    }[] = []
    const labels: string[] = []

    for (const { items, upTo, section } of timeseriesIterator) {
      if (section === 'before') continue

      labels.push(formatDate(upTo, 'MMM d, yyyy'))
      data.push({ x: data.length, y: data.length === 0 ? 0 : data[data.length - 1].y })

      for (const transaction of items) {
        if (typeof transaction.category === 'undefined') {
          continue
        }

        if (hideFinancialIncome && transaction.category.name === 'Financial income') {
          continue
        }

        if (transaction.sender?.isMine ?? false) {
          let amount = transaction.amount
          if (transaction.currencyId !== defaultCurrency.id) {
            amount *= exchangeRateOnDay(transaction.currencyId, defaultCurrency!.id, transaction.date)
          }

          data[data.length - 1].y = (data[data.length - 1].y as number) - amount
        }
        if (transaction.receiver?.isMine ?? false) {
          let amount = transaction.receiverAmount
          if (transaction.receiverCurrencyId !== defaultCurrency.id) {
            amount *= exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency!.id, transaction.date)
          }
          data[data.length - 1].y = (data[data.length - 1].y as number) + amount
        }
      }
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
  }, [defaultCurrency, privacyMode, showLabelEveryFactor, hideFinancialIncome, timeseriesIterator])
}

export default AggregatedDiffChart
