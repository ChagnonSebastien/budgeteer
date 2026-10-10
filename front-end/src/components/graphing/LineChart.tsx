import { useTheme } from '@mui/material'
import React, { FC, useCallback, useMemo, useState } from 'react'

import {
  DateAxisConfig,
  DateBasedGraph,
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
}) => {
  const [tooltip, setTooltip] = useState<TooltipDefinition | null>(null)
  const theme = useTheme()

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

  const splines = useMemo(() => {
    return datasets.map((values) => {
      const segments: [number, number][][] = [[]]
      values.forEach((value, i) => {
        if (value === null) {
          if (segments[segments.length - 1].length > 0) segments.push([])
          return
        }
        segments[segments.length - 1].push([xScale(i), yNormalScale(value)])
      })
      return segments.map(monotoneSpline).join(' ')
    })
  }, [data, datasets, xScale, yNormalScale])

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

  const showTooltipAt = (e: React.PointerEvent<SVGSVGElement>) => {
    const boundingRect = e.currentTarget.getBoundingClientRect()
    const sliceWidth = boundingRect.width / (data.length - 1)
    const percentage = (e.clientX - boundingRect.left) / boundingRect.width
    const index = Math.floor(percentage * data.length)
    setTooltip({
      index,
      x: e.clientX,
      y: e.clientY,
      side: index < data.length / 2 ? 'right' : 'left',
      slice: sliceWidth,
    })
  }

  const graph = useMemo(
    () => (
      <svg
        preserveAspectRatio="none"
        viewBox={`0 0 1000 1000`}
        style={{
          height: '100%',
          width: '100%',
          position: 'absolute',
          zIndex: 1,
          touchAction: 'pan-y',
        }}
        onPointerMove={showTooltipAt}
        onPointerDown={showTooltipAt}
      >
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
      </svg>
    ),
    [layers, datasetLabels, getColor],
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
