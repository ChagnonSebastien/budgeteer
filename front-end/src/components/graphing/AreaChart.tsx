import React, { FC, useMemo, useState } from 'react'

import {
  DateAxisConfig,
  DateBasedGraph,
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

type DataSetLabel = string
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
}) => {
  const [tooltip, setTooltip] = useState<TooltipDefinition | null>(null)

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
    const offsets = Array(data.length).fill(0)
    if (offsetType === 'expand') {
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
    return datasets.map((serie) =>
      serie.map((v, i) => {
        const y0 = offsets[i]
        offsets[i] += v
        return [y0, offsets[i]] as [number, number]
      }),
    )
  }, [datasets, offsetType, data.length])

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
      let m = Math.max(0, ...totals)
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

  const xScale = (i: number) => (i / (data.length - 1)) * 1000
  const yNormalScale = (y: number) => 1000 - ((Math.max(y, graphMinY) - graphMinY) / (graphMaxY - graphMinY)) * 1000
  const yExpandedScale = (y: number, i: number) => {
    return yNormalScale(y / datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1][i])
  }

  const buildPath = (layer: [number, number][]) => {
    const bot = layer.map(([y0], i) => [xScale(i), yNormalScale(y0)] as [number, number])
    const top = layer.map(([, y1], i) => [xScale(i), yNormalScale(y1)] as [number, number])
    const rev = [...top].reverse() as [number, number][]
    return `${monotoneSpline(bot)} L${rev[0][0]},${rev[0][1]} ${monotoneSpline(rev).slice(1)} Z`
  }

  const getColor = (id: string) => {
    return datasetLabels.indexOf(id) !== -1 ? colors[datasetLabels.indexOf(id) % colors.length] : '#ccc'
  }

  const individualBaselineSplines = useMemo(() => {
    return datasetsBaselineStackedValue.map((baselineStackedValues, n) => {
      const pts: [number, number][] = []
      for (let i = 0; i < baselineStackedValues.length; i += 1) {
        const value = baselineStackedValues[i]
        if (datasets[n][i] === 0 || data[i].values[datasetLabels[n]].baseline === datasets[n][i]) continue
        pts.push([xScale(i), offsetType === 'expand' ? yExpandedScale(value, i) : yNormalScale(value)])
      }
      return monotoneSpline(pts)
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
  }, [data, offsetType, xScale, yNormalScale])

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
        }}
        onMouseMove={(e) => {
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
        }}
      >
        {/* Layers */}
        {layers.map((layer, li) => (
          <path
            key={`${datasetLabels[li]}-area`}
            d={buildPath(layer)}
            fill={getColor(datasetLabels[li])}
            stroke="none"
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
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="10 4"
          />
        )}
      </svg>
    ),
    [
      showGlobalBaseline,
      globalBaselineSpline,
      layers,
      datasetLabels,
      buildPath,
      getColor,
      brighten,
      showIndividualBaselines,
      individualBaselineSplines,
    ],
  )

  return (
    <DateBasedGraph
      margin={margin}
      yAxisValues={{ graphMinY, graphMaxY, startTick, endTick, step }}
      graph={graph}
      tooltip={tooltip}
      setTooltip={setTooltip}
      range={[data[0].date, data[data.length - 1].date]}
      datasetLength={data.length}
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
