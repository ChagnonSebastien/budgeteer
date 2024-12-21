import { Card } from '@mui/material'
import { ResponsiveBar } from '@nivo/bar'
import {
  addDays,
  differenceInMonths,
  differenceInYears,
  formatDate,
  isBefore,
  isSameDay,
  subMonths,
  subYears,
} from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

export type grouping = 'years' | 'months'

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
    const fromDate = filteredTransactions[filteredTransactions.length - 1].date

    const diffMonths = differenceInMonths(today, fromDate)
    const diffYears = differenceInYears(today, fromDate)

    const subN = grouping === 'months' ? subMonths : subYears
    let i = grouping === 'months' ? diffMonths + 1 : diffYears + 1

    let transactionIndex = filteredTransactions.length - 1
    const data: { date: string; total: number }[] = []

    while (i >= 0) {
      const upTo = subN(today, i)
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

  return data && defaultCurrency ? (
    <ResponsiveBar
      margin={{ top: 10, right: 50, bottom: 70, left: 60 }}
      data={data.slice(data.length - Math.min(data.length, years * (grouping === 'months' ? 12 : 1)))}
      axisBottom={{
        tickRotation: -45,
        format: (props) => formatDate(props, 'MMM d, yyyy'),
      }}
      axisLeft={{
        format: (i) => formatAmount(defaultCurrency, i),
      }}
      tooltip={(props) => (
        <Card style={{ padding: '.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div>From {formatDate(addDays(subMonths(props.indexValue, 1), 1), 'MMM d, yyyy')}</div>
            <div>To {formatDate(props.indexValue, 'MMM d, yyyy')}</div>
            <div>{props.value}</div>
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
