import { useTheme } from '@mui/material'
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
  categories: number[]
  years: number
  grouping: grouping
}

const TrendsChart: FC<Props> = (props) => {
  const { categories, years = 1, grouping = 'months' } = props
  const { defaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedTransactions, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { root } = useContext(CategoryServiceContext)
  const { privacyMode } = useContext(DrawerContext)
  const theme = useTheme()

  const filteredTransactions = useMemo(() => {
    return augmentedTransactions.filter((t) => {
      if (typeof t.category === 'undefined') return false
      if (categories.length === 0 || categories[0] === root.id) return true

      let current = t.category!
      do {
        if (categories.includes(current.id)) return true
        current = current.parent!
      } while (typeof current?.parent !== 'undefined')
      return false
    })
  }, [augmentedTransactions, categories, root])

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
      enableGridY={!privacyMode}
      axisLeft={{
        tickSize: privacyMode ? 0 : 5,
        format: (i) =>
          privacyMode
            ? ''
            : formatAmount(defaultCurrency, i, privacyMode).slice(0, -((defaultCurrency?.decimalPoints ?? 2) + 1)),
      }}
      tooltip={(props) => (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
            }}
          >
            {label(new Date(props.indexValue))}
          </div>
          {!privacyMode && (
            <div
              style={{
                color: props.value! < 0 ? theme.palette.error.light : theme.palette.success.light,
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              {formatFull(defaultCurrency, props.value, privacyMode)}
            </div>
          )}
        </div>
      )}
      enableLabel={false}
      keys={['total']}
      indexBy={'date'}
      theme={{
        ...darkTheme,
        axis: {
          ...darkTheme.axis,
          ticks: {
            ...darkTheme.axis.ticks,
            text: {
              ...darkTheme.axis.ticks.text,
              fontSize: 12,
            },
          },
        },
      }}
      colors={(props) => {
        return props.value! < 0 ? theme.palette.error.light : theme.palette.success.light
      }}
      borderRadius={4}
      padding={0.2}
      animate={true}
      motionConfig="gentle"
    />
  ) : null
}

export default TrendsChart
