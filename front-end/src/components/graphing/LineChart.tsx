import { useTheme } from '@mui/material'
import React, { FC, useCallback, useId, useMemo, useState } from 'react'

import {
  DateAxisConfig,
  DateBasedGraph,
  DateNavigation,
  GraphSvg,
  MarginConfig,
  monotoneSpline,
  TooltipDefinition,
  useValueAxisConfiguration,
  ValueAxisConfig,
} from './TimerangeGraphUtils'

type DataSetLabel = string
export type Bucket = {
  date: Date
  values: Record<DataSetLabel, { amount: number }>
}

// A null amount is a gap: no data for that series at that date.
export type SparseBucket = {
  date: Date
  values: Record<DataSetLabel, { amount: number | null }>
}

export type TooltipSlice = {
  slice: {
    index: number
    stack: {
      layerLabel: string
      value: number
      color: string
      formattedValue: string
    }[]
  }
}

type Props = {
  data: SparseBucket[]
  colors?: string[]
  datasetsLabels?: string[]
  valueFormat?: (v: number) => string
  margin?: MarginConfig
  xAxisConfig?: Partial<DateAxisConfig>
  yAxisConfig?: Partial<ValueAxisConfig>
  stackTooltip?: (tooltipProps: TooltipSlice) => React.ReactNode
  height?: number
  signFillDataset?: string
  navigation?: DateNavigation
  emptyMessage?: string
}

const LineChart: FC<Props> = ({
  data,
  colors = [],
  datasetsLabels: propDatasetsLabels,
  valueFormat = (v) => String(v),
  margin = { top: 20, right: 25, bottom: 65, left: 70 },
  xAxisConfig = {},
  yAxisConfig = {},
  stackTooltip,
  signFillDataset,
  navigation,
  emptyMessage,
}) => {
  const [tooltip, setTooltip] = useState<TooltipDefinition | null>(null)
  const theme = useTheme()
  const clipId = useId().replace(/:/g, '')

  const datasetLabels = useMemo<DataSetLabel[]>(() => {
    if (propDatasetsLabels && propDatasetsLabels.length) return propDatasetsLabels
    const s = new Set<string>()
    data.forEach((b) => Object.keys(b.values).forEach((k) => s.add(k)))
    return Array.from(s)
  }, [data, propDatasetsLabels])

  const datasets = useMemo<(number | null)[][]>(() => {
    return datasetLabels.map((key) =>
      data.map((b) => {
        const value = b.values[key]
        if (typeof value === 'undefined') return 0
        return value.amount === null ? null : value.amount || 0
      }),
    )
  }, [data, datasetLabels])

  const layers = useMemo<[number, number][][]>(() => {
    const offsets = Array(data.length).fill(0)
    return datasets.map((serie) =>
      serie.map((v, i) => {
        const y0 = offsets[i]
        offsets[i] += v ?? 0
        return [y0, offsets[i]] as [number, number]
      }),
    )
  }, [datasets, data.length])

  const dataMaxY = useMemo(
    () =>
      datasets.reduce(
        (prev, dataset) =>
          Math.max(
            prev,
            dataset.reduce<number>(
              (prev, value) => (value === null ? prev : Math.max(prev, value)),
              Number.MIN_SAFE_INTEGER,
            ),
          ),
        Number.MIN_SAFE_INTEGER,
      ),
    [datasets],
  )

  const dataMinY = useMemo(
    () =>
      datasets.reduce(
        (prev, dataset) =>
          Math.min(
            prev,
            dataset.reduce<number>(
              (prev, value) => (value === null ? prev : Math.min(prev, value)),
              Number.MAX_SAFE_INTEGER,
            ),
          ),
        Number.MAX_SAFE_INTEGER,
      ),
    [datasets],
  )

  const { step, graphMinY, graphMaxY, startTick, endTick } = useValueAxisConfiguration(
    dataMinY,
    dataMaxY,
    yAxisConfig.nice || false,
  )

  const xScale = useCallback((i: number) => (i / (data.length - 1)) * 1000, [data.length])
  const yNormalScale = useCallback(
    (y: number) => 1000 - ((Math.max(y, graphMinY) - graphMinY) / (graphMaxY - graphMinY)) * 1000,
    [graphMinY, graphMaxY],
  )

  const getColor = useCallback(
    (id: string) =>
      datasetLabels.indexOf(id) !== -1 ? colors[datasetLabels.indexOf(id) % colors.length] : theme.palette.grey[400],
    [datasetLabels, colors, theme],
  )

  const segments = useMemo(
    () =>
      datasets.map((values) => {
        const segments: [number, number][][] = [[]]
        values.forEach((value, i) => {
          if (value === null) {
            if (segments[segments.length - 1].length > 0) segments.push([])
            return
          }
          segments[segments.length - 1].push([xScale(i), yNormalScale(value)])
        })
        return segments
      }),
    [datasets, xScale, yNormalScale],
  )

  const splines = useMemo(() => segments.map((s) => s.map(monotoneSpline).join(' ')), [segments])

  const zeroY = Math.min(1000, Math.max(0, yNormalScale(0)))

  const signFillPath = useMemo(() => {
    const index = signFillDataset === undefined ? -1 : datasetLabels.indexOf(signFillDataset)
    if (index === -1) return null
    return segments[index]
      .filter((points) => points.length > 1)
      .map(
        (points) => `${monotoneSpline(points)} L${points[points.length - 1][0]},${zeroY} L${points[0][0]},${zeroY} Z`,
      )
      .join(' ')
  }, [segments, signFillDataset, datasetLabels, zeroY])

  const computeStack = (idx: number) =>
    datasetLabels.flatMap((key, li) => {
      const value = datasets[li][idx]
      if (value === null) return []
      return [
        {
          layerLabel: key,
          value,
          color: getColor(key),
          formattedValue: valueFormat(value),
        },
      ]
    })

  const graph = useMemo(
    () => (
      <GraphSvg navigation={navigation} datasetLength={data.length} setTooltip={setTooltip}>
        {signFillPath && (
          <>
            <defs>
              <clipPath id={`${clipId}-above`}>
                <rect x={0} y={0} width={1000} height={zeroY} />
              </clipPath>
              <clipPath id={`${clipId}-below`}>
                <rect x={0} y={zeroY} width={1000} height={1000 - zeroY} />
              </clipPath>
            </defs>
            <path
              d={signFillPath}
              fill={theme.palette.success.main}
              fillOpacity={0.15}
              clipPath={`url(#${clipId}-above)`}
            />
            <path
              d={signFillPath}
              fill={theme.palette.error.main}
              fillOpacity={0.15}
              clipPath={`url(#${clipId}-below)`}
            />
          </>
        )}
        {/* Baselines */}
        {datasetLabels.map((datasetLabel, i) => {
          const path = splines[i]
          if (!path) return null
          const lineColor = getColor(datasetLabel)
          return (
            <path
              key={`${datasetLabel}-spline`}
              vectorEffect="non-scaling-stroke"
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth={2}
            />
          )
        })}
      </GraphSvg>
    ),
    [layers, datasetLabels, getColor, splines, signFillPath, zeroY, clipId, theme, navigation, data.length],
  )

  return (
    <DateBasedGraph
      margin={margin}
      yAxisValues={{
        graphMaxY,
        graphMinY,
        endTick,
        startTick,
        step,
      }}
      graph={graph}
      range={[data[0].date, data[data.length - 1].date]}
      datasetLength={data.length}
      emptyMessage={emptyMessage}
      xAxisConfig={xAxisConfig}
      yAxisConfig={yAxisConfig}
      Tooltip={({ def }) =>
        tooltip &&
        stackTooltip &&
        data[def.index] &&
        stackTooltip({
          slice: {
            index: def.index,
            stack: computeStack(def.index)
              .reverse()
              .filter((s) => s.value !== 0),
          },
        })
      }
      tooltip={tooltip}
      setTooltip={setTooltip}
    />
  )
}

export default LineChart
