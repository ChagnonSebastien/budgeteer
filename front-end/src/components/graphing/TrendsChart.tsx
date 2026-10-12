import { alpha, Box, useTheme } from '@mui/material'
import { BarCustomLayerProps, ResponsiveBar } from '@nivo/bar'
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
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
const noDataLabelMinWidthPx = 56
const projectedLabelLengthPx = 64
const projectedLabelThicknessPx = 18
const barPadding = 0.2
// Share of each segment, on both sides of a point, bent into its curve; above 0.5 the curves overlap.
const trendlineCornerRounding = 0.35

interface Props {
  categories: number[]
  years: number
  grouping: Grouping
  projection: boolean
}

const TrendsChart: FC<Props> = (props) => {
  const { categories, years = 1, grouping = 'months', projection } = props
  const { augmentedTransactions, exchangeRateOnDay, rootCategory, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const theme = useTheme()
  const { ref: containerRef, width: containerWidth } = useElementDimensions(0, 0)

  const visiblePeriods = years * periodsPerYear[grouping]

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

  const netAmount = useCallback(
    (t: (typeof filteredTransactions)[number]) => {
      let amount = 0
      if (t.receiver?.isMine) {
        const multiplier =
          t.receiverCurrencyId === defaultCurrency.id
            ? 1
            : exchangeRateOnDay(t.receiverCurrencyId, defaultCurrency.id, t.date)
        amount += t.receiverAmount * multiplier
      }
      if (t.sender?.isMine) {
        const multiplier =
          t.currencyId === defaultCurrency.id ? 1 : exchangeRateOnDay(t.currencyId, defaultCurrency.id, t.date)
        amount -= t.amount * multiplier
      }
      return amount
    },
    [defaultCurrency, exchangeRateOnDay],
  )

  const { data, firstDataIndex, projected } = useMemo(() => {
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

    const fromDate = filteredTransactions[filteredTransactions.length - 1]?.date ?? toDate

    let subN = subMonths
    let i = differenceInMonths(toDate, fromDate)

    if (grouping === 'weeks') {
      subN = subWeeks
      i = differenceInWeeks(toDate, startOfWeek(fromDate, weekOptions)) - 1
    } else if (grouping === 'quarters') {
      subN = subQuarters
      i = differenceInQuarters(toDate, fromDate)
    } else if (grouping === 'years') {
      subN = subYears
      i = differenceInYears(toDate, fromDate)
    }

    const firstDataIndex = filteredTransactions.length === 0 ? Infinity : Math.max(0, visiblePeriods - 1 - i)
    i = Math.max(i, visiblePeriods - 1)

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

        bucket += netAmount(t)
        transactionIndex -= 1
      }

      data.push({ date: formatDate(upTo, 'MMM d, yyyy'), total: bucket })
      i -= 1
    }

    const currentStart = subN(toDate, 1)
    const elapsedDays = differenceInCalendarDays(today, currentStart) + 1
    const pastPeriods = Math.min(rollingTails[grouping], data.length - 1 - firstDataIndex)
    let projected: number | null = null
    if (projection && pastPeriods > 0) {
      const remainders = Array.from({ length: pastPeriods }, (_, k) => ({
        from: addDays(subN(currentStart, k + 1), elapsedDays),
        to: subN(currentStart, k),
      }))
      const oldest = remainders[remainders.length - 1].from
      let remaindersTotal = 0
      for (const t of filteredTransactions) {
        if (isBefore(t.date, oldest)) break
        if (remainders.some((r) => !isBefore(t.date, r.from) && isBefore(t.date, r.to))) {
          remaindersTotal += netAmount(t)
        }
      }
      projected = data[data.length - 1].total + remaindersTotal / pastPeriods
    }

    return { data, firstDataIndex: Math.min(firstDataIndex, data.length), projected }
  }, [filteredTransactions, netAmount, grouping, visiblePeriods, projection])

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
    if (data.length < 2) {
      return null
    }

    const movingAverages: { index: number; value: number | null }[] = []

    for (let i = 0; i < data.length; i++) {
      if (i < firstDataIndex) {
        movingAverages.push({ index: i, value: null })
        continue
      }

      const windowSize = Math.min(i - firstDataIndex + 1, rollingTail)
      let sum = 0

      for (let j = 0; j < windowSize; j++) {
        sum += i - j === data.length - 1 && projected !== null ? projected : data[i - j].total
      }

      const average = sum / windowSize
      movingAverages.push({ index: i, value: average })
    }

    return movingAverages.slice(data.length - visiblePeriods)
  }, [data, firstDataIndex, projected, visiblePeriods, rollingTail])

  const visibleData = useMemo(() => data.slice(data.length - visiblePeriods), [data, visiblePeriods])
  const visibleNoDataCount = Math.max(0, firstDataIndex - (data.length - visiblePeriods))

  const valueDomain = useMemo(() => {
    const values = [0, ...visibleData.map((d) => d.total), ...(projected === null ? [] : [projected])]
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [visibleData, projected])

  const projectionLayer = useCallback(
    ({ bars, yScale }: BarCustomLayerProps<{ date: string; total: number }>) => {
      const bar = bars[bars.length - 1]
      if (projected === null || !bar) return null
      const scale = yScale as unknown as (value: number) => number
      const actual = bar.data.value ?? 0
      const extendsBar = Math.sign(actual) === Math.sign(projected) && Math.abs(projected) > Math.abs(actual)
      const base = scale(extendsBar ? actual : 0)
      const end = scale(projected)
      const color = projected < 0 ? theme.palette.error.light : theme.palette.success.light
      const left = bar.x + 0.75
      const right = bar.x + bar.width - 0.75
      const zoneHeight = Math.abs(base - end)
      const centerX = bar.x + bar.width / 2
      const centerY = (base + end) / 2
      const labelRotation =
        bar.width >= projectedLabelLengthPx && zoneHeight >= projectedLabelThicknessPx
          ? 0
          : zoneHeight >= projectedLabelLengthPx && bar.width >= projectedLabelThicknessPx
            ? -90
            : null
      return (
        <g pointerEvents="none">
          <path
            d={`M${left},${base} L${left},${end} L${right},${end} L${right},${base}`}
            fill={alpha(color, 0.12)}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
          {labelRotation !== null && (
            <text
              x={centerX}
              y={centerY}
              transform={`rotate(${labelRotation} ${centerX} ${centerY})`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={theme.typography.caption.fontSize}
              fill={theme.palette.text.secondary}
            >
              Projected
            </text>
          )}
        </g>
      )
    },
    [projected, theme],
  )

  const noDataLayer = useCallback(
    ({ xScale, innerWidth, innerHeight }: BarCustomLayerProps<{ date: string; total: number }>) => {
      if (visibleNoDataCount === 0) return null
      const band = xScale as unknown as { (value: string): number; step(): number }
      const width =
        visibleNoDataCount >= visibleData.length
          ? innerWidth
          : band(visibleData[visibleNoDataCount].date) - (band.step() * barPadding) / 2
      return (
        <g pointerEvents="none">
          <rect width={width} height={innerHeight} fill={theme.palette.surface.strong} rx={4} />
          {width >= noDataLabelMinWidthPx && (
            <text
              x={width / 2}
              y={innerHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={theme.typography.caption.fontSize}
              fill={theme.palette.text.secondary}
            >
              No data
            </text>
          )}
        </g>
      )
    },
    [visibleNoDataCount, visibleData, theme],
  )

  const trendlinePath = useMemo(() => {
    if (!trendlineData) return ''
    const n = trendlineData.length
    const xSpan = (100 * ((n - 0.2) / n) * (n - 1)) / n
    const xOffset = 100 - (100 * ((n - 0.1) / n) * (n - 0.5)) / n
    const minValue = valueDomain.min
    const valueRange = valueDomain.max - minValue
    const points = trendlineData
      .filter((point) => point.value !== null)
      .map((point) => ({
        x: ((point.index - (data.length - n)) / Math.max(n - 1, 1)) * xSpan + xOffset,
        y: 100 - ((point.value! - minValue) / valueRange) * 100,
      }))
    if (points.length === 0) return ''

    const towards = (from: { x: number; y: number }, to: { x: number; y: number }) =>
      `${from.x + (to.x - from.x) * trendlineCornerRounding},${from.y + (to.y - from.y) * trendlineCornerRounding}`
    let path = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length - 1; i++) {
      const corner = points[i]
      path += ` L${towards(corner, points[i - 1])} Q${corner.x},${corner.y} ${towards(corner, points[i + 1])}`
    }
    const last = points[points.length - 1]
    return `${path} L${last.x},${last.y}`
  }, [trendlineData, valueDomain, data.length])

  const tickValues = useMemo(() => {
    const plotWidth = containerWidth - chartMargin.left - chartMargin.right
    const maxTicks = Math.max(1, Math.floor(plotWidth / minTickSpacingPx))
    const step = Math.ceil(visibleData.length / maxTicks)
    if (step <= 1) return undefined
    return visibleData.filter((_, index) => (visibleData.length - 1 - index) % step === 0).map((d) => d.date)
  }, [visibleData, containerWidth])

  return (
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
            <path
              d={trendlinePath}
              fill="none"
              stroke={theme.palette.text.primary}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
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
        valueScale={{ type: 'linear', min: valueDomain.min, max: valueDomain.max, nice: false }}
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
            {props.index < visibleNoDataCount ? (
              <Box sx={{ color: 'text.secondary' }}>No data</Box>
            ) : (
              !privacyMode && (
                <>
                  <Box sx={{ color: gainColor(props.value!) }}>
                    {formatFull(defaultCurrency, props.value, privacyMode)}
                  </Box>
                  {props.index === visibleData.length - 1 && projected !== null && (
                    <Box sx={{ color: 'text.secondary' }}>
                      Projected {formatFull(defaultCurrency, projected, privacyMode)}
                    </Box>
                  )}
                </>
              )
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
        padding={barPadding}
        layers={['grid', 'axes', noDataLayer, 'bars', projectionLayer, 'markers', 'legends', 'annotations']}
        animate={false}
      />
    </div>
  )
}

export default TrendsChart
