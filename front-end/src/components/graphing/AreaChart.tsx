import { useTheme } from '@mui/material'
import React, { FC, useCallback, useMemo, useState } from 'react'

import assignAreaColors from './assignAreaColors'
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

function brighten(hex: string, amount = 0.4): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lightenFactor = amount
  const lr = Math.round(r + (255 - r) * lightenFactor)
  const lg = Math.round(g + (255 - g) * lightenFactor)
  const lb = Math.round(b + (255 - b) * lightenFactor)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

function darken(hex: string, amount = 0.45): string {
  const channel = (i: number) =>
    Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(1)}${channel(3)}${channel(5)}`
}

type DataSetLabel = string

export type ColorReference = { data: Bucket[]; labels: DataSetLabel[] }

const stackedLayers = (data: Bucket[], labels: DataSetLabel[]) => {
  const offsets = Array(data.length).fill(0)
  return labels.map((key) =>
    data.map((b, i) => {
      const y0 = offsets[i]
      offsets[i] += b.values[key]?.amount || 0
      return [y0, offsets[i]] as [number, number]
    }),
  )
}
export type Bucket = {
  date: Date
  values: Record<DataSetLabel, { amount: number; baseline?: number }>
  baseline?: number
}

export type TooltipSlice = {
  slice: {
    index: number
    stack: {
      layerLabel: string
      value: number
      color: string
      formattedValue: string
      baseline: number
      gain: number
      gainFormatted: string
    }[]
  }
}

type Props = {
  data: Bucket[]
  order?: 'normal' | 'reverse'
  offsetType?: 'normal' | 'expand'
  colors?: string[]
  datasetsLabels?: string[]
  valueFormat?: (v: number) => string
  margin?: MarginConfig
  xAxisConfig: Partial<DateAxisConfig>
  yAxisConfig: Partial<ValueAxisConfig>
  stackTooltip?: (tooltipProps: TooltipSlice) => React.ReactNode
  height?: number
  showGlobalBaseline?: boolean
  showIndividualBaselines?: boolean
  minYValue?: number
  navigation?: DateNavigation
  colorReference?: ColorReference
  emptyMessage?: string
}

const AreaChart: FC<Props> = ({
  data,
  offsetType = 'normal',
  colors = [],
  datasetsLabels: propDatasetsLabels,
  valueFormat = (v) => String(v),
  margin = { top: 20, right: 25, bottom: 65, left: 70 },
  xAxisConfig,
  yAxisConfig,
  stackTooltip,
  showGlobalBaseline = false,
  showIndividualBaselines = false,
  minYValue = 0,
  navigation,
  colorReference,
  emptyMessage,
}) => {
  const [tooltip, setTooltip] = useState<TooltipDefinition | null>(null)
  const theme = useTheme()

  const datasetLabels = useMemo<DataSetLabel[]>(() => {
    if (propDatasetsLabels && propDatasetsLabels.length) return propDatasetsLabels
    const s = new Set<string>()
    data.forEach((b) => Object.keys(b.values).forEach((k) => s.add(k)))
    return Array.from(s)
  }, [data, propDatasetsLabels])

  const datasets = useMemo<number[][]>(() => {
    return datasetLabels.map((key) => data.map((b) => b.values[key]?.amount || 0))
  }, [data, datasetLabels])

  const datasetsStackedUpperBound = useMemo(() => {
    const offsets = Array(data.length).fill(0)
    return datasets.map((dataset) =>
      dataset.map((v, i) => {
        offsets[i] += v
        return offsets[i]
      }),
    )
  }, [data, datasets])

  const datasetsBaselineStackedValue = useMemo(() => {
    return datasetLabels.map((key, n) => {
      const datasetJustBelow = n === 0 ? Array(data.length).fill(0) : datasetsStackedUpperBound[n - 1]
      return data.map((b, i) => datasetJustBelow[i] + (b.values[key]?.baseline || 0))
    })
  }, [datasetLabels, data, datasetsStackedUpperBound])

  const layers = useMemo<[number, number][][]>(() => {
    if (offsetType === 'expand') {
      const offsets = Array(data.length).fill(0)
      const totals = data.map((_, i) => datasets.reduce((sum, s) => sum + s[i], 0))
      return datasets.map((serie) =>
        serie.map((v, i) => {
          const y0 = offsets[i]
          const val = totals[i] > 0 ? v / totals[i] : 0
          const y1 = y0 + val
          offsets[i] = y1
          return [y0, y1] as [number, number]
        }),
      )
    }
    return stackedLayers(data, datasetLabels)
  }, [datasets, offsetType, data, datasetLabels])

  const rawMaxY = useMemo(() => {
    const totals = datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1]

    if (offsetType === 'expand') {
      let maxFrac = 1
      if (showIndividualBaselines)
        datasetsBaselineStackedValue.forEach((baseLineDataset) =>
          baseLineDataset.forEach((value, i) => {
            const frac = value / datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1][i]
            if (frac > maxFrac) maxFrac = frac
          }),
        )
      if (showGlobalBaseline)
        data.forEach((bucket, i) => {
          const frac = (bucket.baseline ?? 0) / datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1][i]
          if (frac > maxFrac) maxFrac = frac
        })
      return maxFrac
    } else {
      let m = Math.max(0, ...(totals ?? []))
      // also consider any baseline that may sit above the stack bottom
      datasetLabels.forEach((key, li) => {
        layers[li].forEach(([y0], i) => {
          const bl = data[i].values[key]?.baseline
          if (bl != null) {
            m = Math.max(m, y0 + bl)
          }
        })
      })
      return m
    }
  }, [data, layers, datasetLabels, offsetType, datasetsStackedUpperBound])

  const { minY, maxY } = useMemo(() => {
    const minY = minYValue
    const maxY = Math.max(rawMaxY, minY)
    return {
      minY,
      maxY,
    }
  }, [minYValue, rawMaxY])

  const { step, startTick, endTick, graphMinY, graphMaxY } = useValueAxisConfiguration(
    minY,
    maxY,
    offsetType === 'normal' && (yAxisConfig.nice || false),
  )

  const xScale = useCallback((i: number) => (i / (data.length - 1)) * 1000, [data.length])
  const yNormalScale = useCallback(
    (y: number) => 1000 - ((Math.max(y, graphMinY) - graphMinY) / (graphMaxY - graphMinY)) * 1000,
    [graphMinY, graphMaxY],
  )
  const yExpandedScale = useCallback(
    (y: number, i: number) => yNormalScale(y / datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1][i]),
    [yNormalScale, datasetsStackedUpperBound],
  )

  const buildPath = useCallback(
    (layer: [number, number][]) => {
      const bot = layer.map(([y0], i) => [xScale(i), yNormalScale(y0)] as [number, number])
      const top = layer.map(([, y1], i) => [xScale(i), yNormalScale(y1)] as [number, number])
      const rev = [...top].reverse() as [number, number][]
      return `${monotoneSpline(bot)} L${rev[0][0]},${rev[0][1]} ${monotoneSpline(rev).slice(1)} Z`
    },
    [xScale, yNormalScale],
  )

  const referenceColors = useMemo(() => {
    if (!colorReference) return null
    const assigned = assignAreaColors(stackedLayers(colorReference.data, colorReference.labels), colors)
    return new Map(colorReference.labels.map((label, i) => [label, assigned[i]]))
  }, [colorReference, colors])

  const assignedColors = useMemo(
    () =>
      referenceColors ? datasetLabels.map((label) => referenceColors.get(label)!) : assignAreaColors(layers, colors),
    [referenceColors, datasetLabels, layers, colors],
  )

  const getColor = useCallback(
    (id: string) => assignedColors[datasetLabels.indexOf(id)] ?? theme.palette.grey[400],
    [assignedColors, datasetLabels, theme],
  )

  const individualBaselineSplines = useMemo(() => {
    return datasetsBaselineStackedValue.map((baselineStackedValues, n) => {
      const deviates = (i: number) => {
        const values = data[i]?.values[datasetLabels[n]]
        return values !== undefined && values.baseline !== values.amount
      }
      const segments: [number, number][][] = []
      let segment: [number, number][] = []
      for (let i = 0; i < baselineStackedValues.length; i += 1) {
        if (!(deviates(i) || deviates(i - 1) || deviates(i + 1))) {
          if (segment.length > 1) segments.push(segment)
          segment = []
          continue
        }
        const value = baselineStackedValues[i]
        segment.push([xScale(i), offsetType === 'expand' ? yExpandedScale(value, i) : yNormalScale(value)])
      }
      if (segment.length > 1) segments.push(segment)
      return segments.map(monotoneSpline).join(' ')
    })
  }, [data, datasets, datasetsBaselineStackedValue, offsetType, xScale, yNormalScale, yExpandedScale])

  const globalBaselineSpline = useMemo<string>(() => {
    const pts: [number, number][] = []
    data.forEach((b, i) => {
      if (b.baseline != null) {
        pts.push([xScale(i), offsetType === 'expand' ? yExpandedScale(b.baseline, i) : yNormalScale(b.baseline)])
      }
    })
    return pts.length > 1 ? monotoneSpline(pts) : ''
  }, [data, offsetType, xScale, yNormalScale, yExpandedScale])

  const computeStack = (idx: number) =>
    datasetLabels.map((key, li) => {
      const value = datasets[li][idx]
      const rawBaseline = data[idx].values[key]?.baseline ?? 0
      const gain = rawBaseline != null ? value - rawBaseline : 0
      return {
        layerLabel: key,
        value,
        color: getColor(key),
        formattedValue: valueFormat(value),
        baseline: rawBaseline,
        gain,
        gainFormatted: valueFormat(gain),
      }
    })

  const range = useMemo<[Date, Date]>(() => [data[0].date, data[data.length - 1].date], [data])

  const shapes = useMemo(
    () => (
      <>
        {/* Layers */}
        {layers.map((layer, li) => (
          <path
            key={`${datasetLabels[li]}-area`}
            d={buildPath(layer)}
            fill={getColor(datasetLabels[li])}
            stroke={darken(getColor(datasetLabels[li]))}
            strokeWidth={0.75}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Baselines */}
        {showIndividualBaselines &&
          layers.map((_, li) => {
            const key = datasetLabels[li]
            const path = individualBaselineSplines[li]
            if (!path) return null
            const areaColor = getColor(key)
            const baselineColor = brighten(areaColor)
            return (
              <path
                key={`${key}-baseline`}
                vectorEffect="non-scaling-stroke"
                d={path}
                fill="none"
                stroke={baselineColor}
                strokeWidth={2}
                strokeDasharray="10 4"
              />
            )
          })}

        {/* Global baseline trendline */}
        {showGlobalBaseline && globalBaselineSpline && (
          <path
            d={globalBaselineSpline}
            vectorEffect="non-scaling-stroke"
            fill="none"
            stroke={theme.palette.common.white}
            strokeWidth={2}
            strokeDasharray="10 4"
          />
        )}
      </>
    ),
    [
      showGlobalBaseline,
      globalBaselineSpline,
      layers,
      datasetLabels,
      buildPath,
      getColor,
      showIndividualBaselines,
      individualBaselineSplines,
      theme,
    ],
  )

  const graph = (
    <GraphSvg navigation={navigation} datasetLength={data.length} setTooltip={setTooltip}>
      {shapes}
    </GraphSvg>
  )

  return (
    <DateBasedGraph
      margin={margin}
      yAxisValues={{ graphMinY, graphMaxY, startTick, endTick, step }}
      graph={graph}
      tooltip={tooltip}
      setTooltip={setTooltip}
      range={range}
      datasetLength={data.length}
      emptyMessage={emptyMessage}
      yAxisConfig={yAxisConfig}
      xAxisConfig={xAxisConfig}
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
    />
  )
}

export default AreaChart
