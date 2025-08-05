import { formatDate } from 'date-fns'
import React, { FC, useContext, useMemo } from 'react'

import {
  GraphTooltip,
  GraphTooltipColor,
  GraphTooltipDate,
  GraphTooltipLabel,
  GraphTooltipRow,
  GraphTooltipValue,
} from './GraphStyledComponents'
import LineChart, { Bucket, TooltipSlice } from './LineChart'
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

type TooltipProps = {
  tooltipProps: TooltipSlice
  labels: Date[]
}

export const Tooltip: FC<TooltipProps> = ({ tooltipProps, labels }) => {
  const { privacyMode } = useContext(DrawerContext)
  const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')

  return (
    <GraphTooltip>
      <GraphTooltipDate>{date}</GraphTooltipDate>

      {tooltipProps.slice.stack.map((s) => {
        return (
          <div key={`${date}-${s.layerLabel}`}>
            {/* main row */}
            <GraphTooltipRow>
              <GraphTooltipColor style={{ backgroundColor: s.color }} />
              <GraphTooltipLabel>{s.layerLabel}</GraphTooltipLabel>

              {!privacyMode && (
                <>
                  <div>:</div>
                  <div style={{ minWidth: '1rem', flexGrow: 1 }} />
                  <GraphTooltipValue>{s.formattedValue}</GraphTooltipValue>
                </>
              )}
            </GraphTooltipRow>
          </div>
        )
      })}
    </GraphTooltip>
  )
}

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
    const data: Bucket[] = []
    const labels: Date[] = []

    for (const { items, upTo, section } of timeseriesIterator) {
      if (section === 'before') continue

      labels.push(upTo)
      data.push({
        date: upTo,
        values: { Diff: { amount: data.length === 0 ? 0 : data[data.length - 1].values['Diff'].amount } },
      })

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

          data[data.length - 1].values['Diff'].amount -= amount
        }
        if (transaction.receiver?.isMine ?? false) {
          let amount = transaction.receiverAmount
          if (transaction.receiverCurrencyId !== defaultCurrency.id) {
            amount *= exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency!.id, transaction.date)
          }
          data[data.length - 1].values['Diff'].amount += amount
        }
      }
    }

    return (
      <LineChart
        data={data}
        datasetsLabels={['Diff']}
        valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
        margin={{ top: 30, right: 25, bottom: 80, left: 60 }}
        axisBottom={{
          format: (i) =>
            (data.length - i - 1) % showLabelEveryFactor === 0 ? labels[i] && formatDate(labels[i], 'MMM d, yyyy') : '',
          tickSize: 5,
        }}
        enableGridY={!privacyMode}
        axisLeft={{
          tickSize: privacyMode ? 0 : 5,
          format: (i) => {
            return privacyMode
              ? ''
              : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                  notation: 'compact',
                })
          },
        }}
        colors={darkColors}
        stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={labels} />}
      />
    )
  }, [defaultCurrency, privacyMode, showLabelEveryFactor, hideFinancialIncome, timeseriesIterator])
}

export default AggregatedDiffChart
