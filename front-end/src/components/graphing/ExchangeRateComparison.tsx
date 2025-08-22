import { formatDate } from 'date-fns'
import { FC, useCallback, useContext, useMemo } from 'react'

import {
  GraphTooltip,
  GraphTooltipColor,
  GraphTooltipDate,
  GraphTooltipLabel,
  GraphTooltipRow,
  GraphTooltipValue,
} from './GraphStyledComponents'
import LineChart, { Bucket, TooltipSlice } from './LineChart'
import { CurrencyID } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import { darkColors } from '../../utils'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

type TooltipProps = {
  tooltipProps: TooltipSlice
  labels: Date[]
}

const Tooltip: FC<TooltipProps> = ({ tooltipProps, labels }) => {
  const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')

  return (
    <GraphTooltip>
      <GraphTooltipDate>{date}</GraphTooltipDate>

      {tooltipProps.slice.stack
        .sort((a, b) => b.value - a.value)
        .map((s) => {
          return (
            <div key={`${date}-${s.layerLabel}`}>
              {/* main row */}
              <GraphTooltipRow>
                <GraphTooltipColor style={{ backgroundColor: s.color }} />
                <GraphTooltipLabel>{s.layerLabel}</GraphTooltipLabel>

                <div>:</div>
                <div style={{ minWidth: '1rem', flexGrow: 1 }} />
                <GraphTooltipValue>{s.formattedValue}</GraphTooltipValue>
              </GraphTooltipRow>
            </div>
          )
        })}
    </GraphTooltip>
  )
}

type Props = {
  startDate: Date
  endDate: Date
  selectedCurrenciesIDs?: CurrencyID[]
}

const ExchangeRateComparison: FC<Props> = (props) => {
  const { startDate, endDate, selectedCurrenciesIDs = [] } = props

  const { exchangeRates, exchangeRateOnDay, augmentedTransactions, defaultCurrency, accountBalances } =
    useContext(MixedAugmentation)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { myOwnAccounts } = useContext(AccountServiceContext)

  const isSelected = useCallback(
    (id: CurrencyID) => {
      if (id === defaultCurrency.id) return false
      if (selectedCurrenciesIDs.length === 0) {
        return accountBalances.values().some((ab) => (ab.get(id) ?? 0) > 0)
      }
      return selectedCurrenciesIDs.includes(id)
    },
    [selectedCurrenciesIDs],
  )

  const group = useCallback((id: CurrencyID) => currencies.find((c) => c.id === id)?.name ?? 'Unknown', [currencies])

  const { timeseriesIteratorGenerator, showLabelEveryFactor } = useTimerangeSegmentation(startDate, endDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const data = useMemo(() => {
    const currentlyHeld = new Map<CurrencyID, number>()
    const dividends = new Map<CurrencyID, number>()
    const initialRate = new Map<CurrencyID, number>()
    const data: Bucket[] = [{ date: startDate, values: {} }]
    for (const currency of currencies) {
      if (!isSelected(currency.id)) continue
      currentlyHeld.set(currency.id, 0)
      dividends.set(currency.id, 1)
      initialRate.set(currency.id, exchangeRateOnDay(currency.id, defaultCurrency.id, startDate))
      data[0].values[group(currency.id)] = { amount: 1 }
    }

    myOwnAccounts.forEach((account) => {
      for (const initialAmount of account.initialAmounts) {
        if (!isSelected(initialAmount.currencyId)) continue
        currentlyHeld.set(initialAmount.currencyId, currentlyHeld.get(initialAmount.currencyId)! + initialAmount.value)
      }
    })

    for (const { section, upTo, items } of timeseriesIterator) {
      if (section === 'before') {
        for (const transaction of items) {
          if (transaction.receiver?.isMine && isSelected(transaction.receiverCurrencyId)) {
            currentlyHeld.set(
              transaction.receiverCurrencyId,
              currentlyHeld.get(transaction.receiverCurrencyId)! + transaction.receiverAmount,
            )
          }

          if (transaction.sender?.isMine && isSelected(transaction.currencyId)) {
            currentlyHeld.set(transaction.currencyId, currentlyHeld.get(transaction.currencyId)! + transaction.amount)
          }
        }

        continue
      }

      for (const transaction of items) {
        if (transaction.receiver?.isMine && isSelected(transaction.receiverCurrencyId)) {
          currentlyHeld.set(
            transaction.receiverCurrencyId,
            currentlyHeld.get(transaction.receiverCurrencyId)! + transaction.receiverAmount,
          )
        }

        if (transaction.sender?.isMine && isSelected(transaction.currencyId)) {
          currentlyHeld.set(transaction.currencyId, currentlyHeld.get(transaction.currencyId)! + transaction.amount)
        }

        if (
          transaction.financialIncomeCurrencyId !== null &&
          isSelected(transaction.financialIncomeCurrencyId) &&
          transaction.receiver?.isMine
        ) {
          if (transaction.receiverCurrencyId === transaction.financialIncomeCurrencyId) {
            dividends.set(
              transaction.financialIncomeCurrencyId,
              (dividends.get(transaction.financialIncomeCurrencyId)! *
                (currentlyHeld.get(transaction.financialIncomeCurrencyId)! - transaction.receiverAmount)) /
                currentlyHeld.get(transaction.financialIncomeCurrencyId)!,
            )
          } else if (transaction.currencyId === transaction.financialIncomeCurrencyId) {
            dividends.set(
              transaction.financialIncomeCurrencyId,
              (dividends.get(transaction.financialIncomeCurrencyId)! *
                (currentlyHeld.get(transaction.financialIncomeCurrencyId)! - transaction.amount)) /
                currentlyHeld.get(transaction.financialIncomeCurrencyId)!,
            )
          } else {
            const factor = exchangeRateOnDay(
              transaction.receiverCurrencyId,
              transaction.financialIncomeCurrencyId,
              transaction.date,
            )
            dividends.set(
              transaction.financialIncomeCurrencyId,
              (dividends.get(transaction.financialIncomeCurrencyId)! *
                (currentlyHeld.get(transaction.financialIncomeCurrencyId)! - transaction.receiverAmount * factor)) /
                currentlyHeld.get(transaction.financialIncomeCurrencyId)!,
            )
          }
        }
      }

      const values: Record<string, { amount: number }> = {}
      for (const currency of currencies) {
        if (!isSelected(currency.id)) continue
        const currentRate = exchangeRateOnDay(currency.id, defaultCurrency.id, upTo)
        const wouldBe = dividends.get(currency.id)! * initialRate.get(currency.id)!
        values[group(currency.id)] = { amount: currentRate / wouldBe }
      }
      data.push({ date: upTo, values: values })
    }

    return data
  }, [currencies, isSelected, exchangeRates, exchangeRateOnDay, augmentedTransactions])

  const dateVisibility = data.reduce((map, bucket, i) => {
    if ((data.length - i - 1) % showLabelEveryFactor === 0) {
      map.set(bucket.date.getTime(), data[i].date && formatDate(data[i].date, 'MMM d, yyyy'))
    }
    return map
  }, new Map<number, string>())

  return (
    <LineChart
      margin={{ top: 20, right: 20, bottom: 80, left: 60 }}
      data={data}
      xAxisConfig={{
        format: (date) => dateVisibility.get(date.getTime()) ?? '',
        grid: true,
      }}
      yAxisConfig={{
        format: (n) => `${(n * 100 - 100).toFixed(0)}%`,
        grid: true,
      }}
      valueFormat={(value) => `${(value * 100).toFixed(2)}%`}
      colors={darkColors}
      stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={data.map((d) => d.date)} />}
    />
  )
}

export default ExchangeRateComparison
