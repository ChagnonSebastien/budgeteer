import { Box, useTheme } from '@mui/material'
import { ResponsiveBar } from '@nivo/bar'
import {
  addMonths,
  addWeeks,
  differenceInMonths,
  differenceInQuarters,
  differenceInWeeks,
  differenceInYears,
  formatDate,
  isBefore,
  isSameDay,
  startOfWeek,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from 'date-fns'
import { FC, useCallback, useContext, useMemo } from 'react'

import { gainColor, GraphTooltip, GraphTooltipDate } from './GraphStyledComponents'
import { formatAmount, formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'
import { useElementDimensions } from '../shared/useDimensions'

export type Grouping = 'years' | 'quarters' | 'months' | 'weeks'

const weekOptions = { weekStartsOn: 1 } as const
const periodsPerYear: Record<Grouping, number> = { weeks: 52, months: 12, quarters: 4, years: 1 }
const rollingTails: Record<Grouping, number> = { weeks: 4, months: 12, quarters: 4, years: 3 }
const chartMargin = { top: 20, right: 25, bottom: 60, left: 70 }
// Horizontal room a 12px label rotated -45deg needs to stay readable next to its neighbour.
const minTickSpacingPx = 36
const shortWeekLabelBelowPx = 600

interface Props {
  categories: number[]
  years: number
  grouping: Grouping
}

const TrendsChart: FC<Props> = (props) => {
  const { categories, years = 1, grouping = 'months' } = props
  const { augmentedTransactions, exchangeRateOnDay, rootCategory, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const theme = useTheme()
  const { ref: containerRef, width: containerWidth } = useElementDimensions(0, 0)

  const filteredTransactions = useMemo(() => {
    return augmentedTransactions.filter((t) => {
      if (typeof t.category === 'undefined') return false
      if (categories.length === 0 || categories[0] === rootCategory.id) return true

      let current = t.category!
      do {
        if (categories.includes(current.id)) return true
        current = current.parent!
      } while (typeof current?.parent !== 'undefined')
      return false
    })
  }, [augmentedTransactions, categories, rootCategory.id])

  const data = useMemo(() => {
    if (filteredTransactions.length === 0) return null
    const today = new Date()
    let toDate = addMonths(today, 1)
    toDate.setDate(1)

    if (grouping === 'weeks') {
      toDate = addWeeks(startOfWeek(today, weekOptions), 1)
    }

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

    if (grouping === 'weeks') {
      subN = subWeeks
      i = differenceInWeeks(toDate, startOfWeek(fromDate, weekOptions)) - 1
    } else if (grouping === 'quarters') {
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
        case 'weeks':
          return formatDate(startOfWeek(d, weekOptions), 'MMM d, yyyy')
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

  const rollingTail = rollingTails[grouping]

  const trendlineData = useMemo(() => {
    if (!data) return null

    if (data.length < 2) {
      return null
    }

    const movingAverages: { index: number; value: number }[] = []

    for (let i = 0; i < data.length; i++) {
      const windowSize = Math.min(i + 1, rollingTail)
      let sum = 0

      for (let j = 0; j < windowSize; j++) {
        sum += data[i - j]?.total
      }

      const average = sum / windowSize
      movingAverages.push({ index: i, value: average })
    }

    return movingAverages.slice(data.length - Math.min(data.length, years * periodsPerYear[grouping]))
  }, [data, years, grouping, rollingTail])

  // Calculate the visible data points
  const visibleData = useMemo(() => {
    if (!data) return []
    return data.slice(data.length - Math.min(data.length, years * periodsPerYear[grouping]))
  }, [data, years, grouping])

  const tickValues = useMemo(() => {
    const plotWidth = containerWidth - chartMargin.left - chartMargin.right
    const maxTicks = Math.max(1, Math.floor(plotWidth / minTickSpacingPx))
    const step = Math.ceil(visibleData.length / maxTicks)
    if (step <= 1) return undefined
    return visibleData.filter((_, index) => (visibleData.length - 1 - index) % step === 0).map((d) => d.date)
  }, [visibleData, containerWidth])

  return data ? (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Trendline overlay */}
      {visibleData.length >= 2 && trendlineData && (
        <svg
          style={{
            position: 'absolute',
            top: 20, // Match top margin
            left: 70, // Match left margin
            width: `calc(100% - 95px)`, // Adjust for margins (left + right)
            height: `calc(100% - 80px)`, // Adjust for margins (top + bottom)
            pointerEvents: 'none', // Allow clicks to pass through
            zIndex: 10,
          }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {trendlineData.map((point, index) => {
              if (index === 0) return null

              const prevPoint = trendlineData[index - 1]

              const x1 =
                ((index - 1) / Math.max(trendlineData.length - 1, 1)) *
                  ((100 * ((trendlineData.length - 0.2) / trendlineData.length) * (trendlineData.length - 1)) /
                    trendlineData.length) +
                (100 -
                  (100 * ((trendlineData.length - 0.1) / trendlineData.length) * (trendlineData.length - 0.5)) /
                    trendlineData.length)
              const x2 =
                (index / Math.max(trendlineData.length - 1, 1)) *
                  ((100 * ((trendlineData.length - 0.2) / trendlineData.length) * (trendlineData.length - 1)) /
                    trendlineData.length) +
                (100 -
                  (100 * ((trendlineData.length - 0.1) / trendlineData.length) * (trendlineData.length - 0.5)) /
                    trendlineData.length)

              const allValues = visibleData.map((d) => d.total)
              const minValue = Math.min(...allValues, 0)
              const maxValue = Math.max(...allValues, 0)
              const valueRange = maxValue - minValue

              const y1 = 100 - ((prevPoint.value - minValue) / valueRange) * 100
              const y2 = 100 - ((point.value - minValue) / valueRange) * 100

              return (
                <line
                  key={index}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke={theme.palette.text.primary}
                  strokeWidth="0.2"
                  strokeDasharray="1,0.5"
                />
              )
            })}
          </svg>

          {/* Add a small legend for the moving average */}
          <g transform="translate(10, 20)">
            <line
              x1="0"
              y1="0"
              x2="20"
              y2="0"
              stroke={theme.palette.common.white}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              strokeLinecap="round"
            />
            <text x="25" y="5" fontSize={theme.typography.caption.fontSize} fill={theme.palette.text.secondary}>
              Rolling Avg ({rollingTail})
            </text>
          </g>
        </svg>
      )}

      <ResponsiveBar
        enableGridY={!privacyMode}
        margin={chartMargin}
        valueScale={{ type: 'linear', min: 'auto', nice: false }}
        data={visibleData}
        axisBottom={{
          tickRotation: -45,
          tickValues,
          format: (props) =>
            grouping === 'weeks' && containerWidth < shortWeekLabelBelowPx
              ? formatDate(startOfWeek(new Date(props), weekOptions), "MMM d ''yy")
              : label(new Date(props)),
        }}
        axisLeft={{
          tickSize: privacyMode ? 0 : 5,
          format: (i) =>
            privacyMode
              ? ''
              : formatAmount(defaultCurrency, i, privacyMode).slice(0, -((defaultCurrency?.decimalPoints ?? 2) + 1)),
        }}
        tooltip={(props) => (
          <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
            <GraphTooltipDate>{label(new Date(props.indexValue))}</GraphTooltipDate>
            {!privacyMode && (
              <Box sx={{ color: gainColor(props.value!) }}>{formatFull(defaultCurrency, props.value, privacyMode)}</Box>
            )}
          </GraphTooltip>
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
        animate={false}
      />
    </div>
  ) : null
}

export default TrendsChart
