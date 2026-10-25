import { Box } from '@mui/material'
import { formatDate, isSameDay, startOfDay } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import {
  GraphTooltip,
  GraphTooltipColor,
  GraphTooltipDate,
  GraphTooltipLabel,
  GraphTooltipRow,
  GraphTooltipValue,
} from './GraphStyledComponents'
import LineChart, { SparseBucket, TooltipSlice } from './LineChart'
import { DateNavigation } from './TimerangeGraphUtils'
import { CurrencyID } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import useTimerangeSegmentation, { dateAxisLabels } from '../shared/useTimerangeSegmentation'

export const useHeldCurrencyIds = () => {
  const { accountBalances } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)

  return useMemo(() => {
    const totals = new Map<CurrencyID, number>()
    for (const account of myOwnAccounts) {
      accountBalances.get(account.id)?.forEach((amount, id) => totals.set(id, (totals.get(id) ?? 0) + amount))
    }
    return new Set([...totals].filter(([, amount]) => amount !== 0).map(([id]) => id))
  }, [accountBalances, myOwnAccounts])
}

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
                <Box sx={{ minWidth: (t) => t.spacing(2), flexGrow: 1 }} />
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
  currencyIds: CurrencyID[]
  colorOf(id: CurrencyID): string
  navigation?: DateNavigation
}

const ExchangeRateComparison: FC<Props> = (props) => {
  const { startDate, endDate, currencyIds, colorOf, navigation } = props

  const { exchangeRates, exchangeRateOnDay, augmentedTransactions, defaultCurrency } = useContext(MixedAugmentation)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const heldCurrencyIds = useHeldCurrencyIds()

  const selected = useMemo(
    () => currencies.filter((c) => c.id !== defaultCurrency.id && currencyIds.includes(c.id)),
    [currencies, currencyIds, defaultCurrency],
  )

  const { timeseriesIteratorGenerator, showLabelEveryFactor } = useTimerangeSegmentation(startDate, endDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const data = useMemo(() => {
    const currentlyHeld = new Map<CurrencyID, number>()
    const dividends = new Map<CurrencyID, number>()
    const initialRate = new Map<CurrencyID, number>()
    const data: SparseBucket[] = []
    const ended = new Set<CurrencyID>()
    const isSelected = (id: CurrencyID) => currentlyHeld.has(id)
    for (const currency of selected) {
      currentlyHeld.set(currency.id, 0)
      dividends.set(currency.id, 1)
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
            currentlyHeld.set(transaction.currencyId, currentlyHeld.get(transaction.currencyId)! - transaction.amount)
          }
        }

        continue
      }

      let heldYesterday = new Map(currentlyHeld.entries())
      let gainToday = new Map<CurrencyID, number>()
      let date = augmentedTransactions.at(-1)?.date ?? new Date()

      const commitDividends = (_d: Date) => {
        for (const [cId, gains] of gainToday) {
          const held = heldYesterday.get(cId)!
          if (held === 0) continue
          const prevDividend = dividends.get(cId)!
          dividends.set(cId, prevDividend * ((held + gains) / held))
        }
      }

      for (const transaction of items) {
        if (!isSameDay(transaction.date, date)) {
          commitDividends(startOfDay(date))

          heldYesterday = new Map(currentlyHeld.entries())
          gainToday = new Map<CurrencyID, number>()
        }

        date = transaction.date

        if (transaction.receiver?.isMine && isSelected(transaction.receiverCurrencyId)) {
          currentlyHeld.set(
            transaction.receiverCurrencyId,
            currentlyHeld.get(transaction.receiverCurrencyId)! + transaction.receiverAmount,
          )
        }

        if (transaction.sender?.isMine && isSelected(transaction.currencyId)) {
          currentlyHeld.set(transaction.currencyId, currentlyHeld.get(transaction.currencyId)! - transaction.amount)
        }

        if (
          transaction.financialIncomeData !== null &&
          isSelected(transaction.financialIncomeData.relatedCurrencyId) &&
          transaction.receiver?.isMine
        ) {
          const cId = transaction.financialIncomeData.relatedCurrencyId
          const prevGains = gainToday.get(cId) ?? 0

          if (transaction.receiverCurrencyId === cId) {
            gainToday.set(cId, prevGains + transaction.receiverAmount)
          } else if (transaction.currencyId === cId) {
            gainToday.set(cId, prevGains + transaction.amount)
          } else {
            const factor = exchangeRateOnDay(transaction.receiverCurrencyId, cId, transaction.date)
            gainToday.set(cId, prevGains + transaction.receiverAmount * factor)
          }
        }

        // A financial loss (fee) leaves my accounts for a third party and shrinks the investment's return.
        if (
          transaction.financialIncomeData !== null &&
          isSelected(transaction.financialIncomeData.relatedCurrencyId) &&
          transaction.sender?.isMine &&
          !transaction.receiver?.isMine
        ) {
          const cId = transaction.financialIncomeData.relatedCurrencyId
          const prevGains = gainToday.get(cId) ?? 0

          if (transaction.currencyId === cId) {
            gainToday.set(cId, prevGains - transaction.amount)
          } else if (transaction.receiverCurrencyId === cId) {
            gainToday.set(cId, prevGains - transaction.receiverAmount)
          } else {
            const factor = exchangeRateOnDay(transaction.currencyId, cId, transaction.date)
            gainToday.set(cId, prevGains - transaction.amount * factor)
          }
        }
      }

      commitDividends(startOfDay(date))

      const values: Record<string, { amount: number | null }> = {}
      for (const currency of selected) {
        const rates = exchangeRates.get(currency.id)?.get(defaultCurrency.id)
        const firstRate = rates?.[0]?.date
        if (typeof firstRate === 'undefined' || upTo.getTime() < firstRate.getTime() || ended.has(currency.id)) {
          values[currency.name] = { amount: null }
          continue
        }
        const currentRate = exchangeRateOnDay(currency.id, defaultCurrency.id, upTo)
        if (!initialRate.has(currency.id)) {
          initialRate.set(currency.id, currentRate)
          dividends.set(currency.id, 1)
        }
        const wouldBe = initialRate.get(currency.id)! / dividends.get(currency.id)!
        values[currency.name] = { amount: currentRate / wouldBe }
        if (!heldCurrencyIds.has(currency.id) && upTo.getTime() >= rates!.at(-1)!.date.getTime()) {
          ended.add(currency.id)
        }
      }
      data.push({ date: upTo, values: values })
    }

    return data
  }, [
    selected,
    heldCurrencyIds,
    myOwnAccounts,
    exchangeRates,
    exchangeRateOnDay,
    augmentedTransactions,
    defaultCurrency,
    timeseriesIterator,
  ])

  const dateVisibility = useMemo(
    () =>
      dateAxisLabels(
        data.map((bucket) => bucket.date),
        showLabelEveryFactor,
      ),
    [data, showLabelEveryFactor],
  )

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
        reference: 1,
      }}
      valueFormat={(value) => `${(value * 100).toFixed(2)}%`}
      datasetsLabels={selected.map((c) => c.name)}
      colors={selected.map((c) => colorOf(c.id))}
      navigation={navigation}
      stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={data.map((d) => d.date)} />}
    />
  )
}

export default ExchangeRateComparison
