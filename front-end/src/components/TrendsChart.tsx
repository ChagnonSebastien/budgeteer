import { Card } from '@mui/material'
import { ResponsiveBar } from '@nivo/bar'
import {
  addMonths,
  differenceInMonths,
  differenceInQuarters,
  differenceInYears,
  formatDate,
  isBefore,
  isSameDay,
  subDays,
  subMonths,
  subQuarters,
  subYears,
} from 'date-fns'
import { FC, useCallback, useContext, useMemo } from 'react'

import { DrawerContext } from './Menu'
import { formatAmount, formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

export type grouping = 'years' | 'quarters' | 'months'

interface Props {
  categoryId: number
  years: number
  grouping: grouping
}

const TrendsChart: FC<Props> = (props) => {
  const { categoryId, years = 1, grouping = 'months' } = props
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedTransactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { root } = useContext(CategoryServiceContext)
  const { anonymity } = useContext(DrawerContext)

  const filteredTransactions = useMemo(() => {
    return augmentedTransactions.filter((t) => {
      if (typeof t.category === 'undefined') return false
      if (categoryId === root.id || categoryId === t.categoryId) return true

      let current = t.category!
      while (typeof current?.parent !== 'undefined') {
        current = current.parent
        if (current.id === categoryId) return true
      }
      return false
    })
  }, [augmentedTransactions, categoryId, root])

  const data = useMemo(() => {
    if (defaultCurrency === null || filteredTransactions.length === 0) return null
    const today = new Date()
    let toDate = addMonths(today, 1)
    toDate.setDate(1)

    if (grouping === 'quarters') {
      while (toDate.getMonth() % 3 !== 0) {
        toDate = addMonths(toDate, 1)
      }
    }

    if (grouping === 'years') {
      while (toDate.getMonth() !== 0) {
        toDate = addMonths(toDate, 1)
      }
    }

    const fromDate = filteredTransactions[filteredTransactions.length - 1].date

    const diffMonths = differenceInMonths(toDate, fromDate)
    const diffQuarters = differenceInQuarters(toDate, fromDate)
    const diffYears = differenceInYears(toDate, fromDate)

    let subN = subMonths
    let i = diffMonths

    if (grouping === 'quarters') {
      subN = subQuarters
      i = diffQuarters
    } else if (grouping === 'years') {
      subN = subYears
      i = diffYears
    }

    let transactionIndex = filteredTransactions.length - 1
    const data: { date: string; total: number }[] = []

    while (i >= 0) {
      const upTo = subDays(subN(toDate, i), 1)
      let bucket = 0

      while (
        transactionIndex >= 0 &&
        (isBefore(filteredTransactions[transactionIndex].date, upTo) ||
          isSameDay(filteredTransactions[transactionIndex].date, upTo))
      ) {
        const t = filteredTransactions[transactionIndex]
        if (isBefore(t.date, fromDate) && !isSameDay(t.date, fromDate)) {
          transactionIndex -= 1
          continue
        }

        if (t.receiver?.isMine) {
          let multiplier = 1
          if (t.receiverCurrencyId !== defaultCurrency.id) {
            multiplier = exchangeRateOnDay(t.receiverCurrencyId, defaultCurrency.id, t.date)
          }

          bucket += t.receiverAmount * multiplier
        }

        if (t.sender?.isMine) {
          let multiplier = 1
          if (t.currencyId !== defaultCurrency.id) {
            multiplier = exchangeRateOnDay(t.currencyId, defaultCurrency.id, t.date)
          }

          bucket -= t.amount * multiplier
        }

        transactionIndex -= 1
      }

      data.push({ date: formatDate(upTo, 'MMM d, yyyy'), total: bucket })
      i -= 1
    }

    return data
  }, [filteredTransactions, defaultCurrency, grouping])

  const label = useCallback(
    (d: Date): string => {
      switch (grouping) {
        case 'months':
          return formatDate(d, 'MMM yyyy')
        case 'quarters':
          return `Q${Math.ceil(d.getMonth() / 3)} ${d.getFullYear()}`
        case 'years':
          return d.getFullYear().toString()
      }
    },
    [grouping],
  )

  return data && defaultCurrency ? (
    <ResponsiveBar
      margin={{ top: 10, right: 50, bottom: 70, left: 60 }}
      data={data.slice(
        data.length - Math.min(data.length, years * (grouping === 'months' ? 12 : grouping === 'quarters' ? 4 : 1)),
      )}
      axisBottom={{
        tickRotation: -45,
        format: (props) => label(new Date(props)),
      }}
      axisLeft={{
        format: (i) =>
          formatAmount(defaultCurrency, i, anonymity).slice(0, -((defaultCurrency?.decimalPoints ?? 2) + 1)),
      }}
      tooltip={(props) => (
        <Card style={{ padding: '.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>{label(new Date(props.indexValue))}</div>
            <div>{formatFull(defaultCurrency, props.value, anonymity)}</div>
          </div>
        </Card>
      )}
      enableLabel={false}
      keys={['total']}
      indexBy={'date'}
      theme={darkTheme}
      colors={(props) => (props.value! < 0 ? '#f88' : '#8f8')}
    />
  ) : null
}

export default TrendsChart
