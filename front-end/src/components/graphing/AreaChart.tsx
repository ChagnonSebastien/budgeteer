import { Box, Typography } from '@mui/material'
import React, { FC, useMemo, useState } from 'react'

import { Column, Row } from '../shared/Layout'

function monotoneSpline(pts: [number, number][]): string {
  const n = pts.length
  if (n < 2) return ''
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const dx = xs.slice(1).map((x, i) => x - xs[i])
  const dy = ys.slice(1).map((y, i) => y - ys[i])
  const slopes = dx.map((d, i) => dy[i] / d || 0)
  const m: number[] = Array(n).fill(0)
  m[0] = slopes[0]
  m[n - 1] = slopes[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m[i] = (w1 + w2) / (w1 / slopes[i - 1] + w2 / slopes[i])
    }
  }
  let path = `M${xs[0]},${ys[0]}`
  for (let i = 0; i < n - 1; i++) {
    const cp1x = xs[i] + dx[i] / 3
    const cp1y = ys[i] + (m[i] * dx[i]) / 3
    const cp2x = xs[i + 1] - dx[i] / 3
    const cp2y = ys[i + 1] - (m[i + 1] * dx[i]) / 3
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${xs[i + 1]},${ys[i + 1]}`
  }
  return path
}

// Brighten a hex color
function brighten(hex: string, amount = 0.4): string {
  // Convert hex to RGB and lighten
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lightenFactor = amount // 40% lighter
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

type MarginConfig = { top: number; right: number; bottom: number; left: number }
type AxisConfig = { format?: (i: number) => string; tickSize?: number; tickPadding?: number }
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
  axisBottom?: AxisConfig
  enableGridY?: boolean
  axisLeft?: AxisConfig
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
  axisBottom = {},
  axisLeft = {},
  stackTooltip,
  showGlobalBaseline = false,
  showIndividualBaselines = false,
  minYValue = 0,
}) => {
  const [tooltip, setTooltip] = useState<{
    index: number
    x: number
    y: number
    side: 'left' | 'right'
    slice: number
  } | null>(null)

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

  const { minY, maxY, domain } = useMemo(() => {
    const minY = minYValue
    const maxY = Math.max(rawMaxY, minY)
    const domain = maxY - minY
    return {
      minY,
      maxY,
      domain,
    }
  }, [minYValue, rawMaxY])

  const xScale = (i: number) => (i / (data.length - 1)) * 1000
  const yNormalScale = (y: number) => 1000 - ((Math.max(y, minY) - minY) / domain) * 1000
  const yExpandedScale = (y: number, i: number) => {
    return yNormalScale(y / datasetsStackedUpperBound[datasetsStackedUpperBound.length - 1][i])
  }

  const { format: fmtX = (i) => String(i), tickSize: tickHeightX = 5 } = axisBottom
  const { format: fmtY = (v) => String(v), tickSize: tickSizeY = 5 } = axisLeft

  const { step, startTick, endTick } = useMemo(() => {
    const count = 10
    const raw = (maxY - minY) / count
    const mag = 10 ** Math.floor(Math.log10(raw))
    const norm = raw / mag
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
    const step = nice * mag

    return {
      step,
      startTick: Math.ceil(minY / step) * step,
      endTick: Math.floor(maxY / step) * step,
    }
  }, [maxY, minY])

  const getColor = (id: string) => {
    return datasetLabels.indexOf(id) !== -1 ? colors[datasetLabels.indexOf(id) % colors.length] : '#ccc'
  }

  const buildPath = (layer: [number, number][]) => {
    const bot = layer.map(([y0], i) => [xScale(i), yNormalScale(y0)] as [number, number])
    const top = layer.map(([, y1], i) => [xScale(i), yNormalScale(y1)] as [number, number])
    const rev = [...top].reverse() as [number, number][]
    return `${monotoneSpline(bot)} L${rev[0][0]},${rev[0][1]} ${monotoneSpline(rev).slice(1)} Z`
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
    <div style={{ position: 'relative', flexGrow: 1 }}>
      <Column
        style={{
          paddingTop: margin.top,
          height: '100%',
          width: '100%',
          position: 'absolute',
        }}
      >
        <Row
          style={{
            flexGrow: 1,
          }}
          onMouseLeave={() => {
            setTooltip(null)
          }}
        >
          <Column
            style={{ width: margin.left, flexDirection: 'column-reverse' }}
            onMouseMove={(e) =>
              setTooltip((prev) =>
                prev
                  ? {
                      ...prev,
                      index: 0,
                      x: e.clientX,
                      y: e.clientY,
                      side: 'right',
                    }
                  : null,
              )
            }
          >
            {Array.from({ length: Math.floor((endTick - startTick) / step) + 1 }, (_, i) => (
              <div key={`y-label-${i}`} style={{ position: 'relative', flexGrow: i === 0 ? startTick - minY : step }}>
                <Box style={{ width: tickSizeY, borderTop: '1px solid white', position: 'absolute', right: 0 }} />
                <Typography
                  style={{
                    transform: `translate(-${tickSizeY + 5}px, -50%)`,
                    transformOrigin: 'center',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    whiteSpace: 'nowrap',
                    fontSize: '0.75rem',
                  }}
                >
                  {fmtY(startTick + i * step)}
                </Typography>
              </div>
            ))}
            <div style={{ flexGrow: maxY - endTick }} />
          </Column>

          <div style={{ flexGrow: 1, position: 'relative' }}>
            {graph}

            {tooltip && (
              <div
                style={{
                  zIndex: 2,
                  position: 'absolute',
                  height: '100%',
                  width: tooltip.index * tooltip.slice,
                  borderRight: '2px dashed rgba(128, 128, 128, 1)',
                  pointerEvents: 'none',
                }}
              />
            )}

            <Column
              style={{
                height: '100%',
                width: '100%',
                flexDirection: 'column-reverse',
                alignItems: 'stretch',
                zIndex: -1,
              }}
            >
              {Array.from({ length: Math.floor((endTick - startTick) / step) + 1 }, (_, i) => (
                <div key={`y-grid-${i}`} style={{ position: 'relative', flexGrow: i === 0 ? startTick - minY : step }}>
                  <Box
                    style={{ width: '100%', borderTop: '1px solid rgba(128, 128, 128, 0.2)', position: 'absolute' }}
                  />
                </div>
              ))}
              <div style={{ flexGrow: maxY - endTick }} />
            </Column>
          </div>

          <Box
            width={margin.right}
            onMouseMove={(e) =>
              setTooltip((prev) =>
                prev
                  ? {
                      ...prev,
                      index: data.length - 1,
                      x: e.clientX,
                      y: e.clientY,
                      side: 'left',
                    }
                  : null,
              )
            }
          />
        </Row>

        <Row style={{ height: margin.bottom, position: 'relative' }}>
          <div style={{ width: margin.left }} />

          <Row style={{ height: margin.bottom, flexGrow: 1 }}>
            {data
              .reduce<{ width: number; label: string }[]>((prev, _current, i) => {
                if (prev.length === 0 || prev[prev.length - 1].label !== '') {
                  prev.push({ width: 0, label: '' })
                }
                const label = fmtX(i)
                if (label) {
                  prev[prev.length - 1].label = label
                }
                if (i > 0) prev[prev.length - 1].width += 1
                return prev
              }, [])
              .map((element) => (
                <div key={`x-label-${element.label}`} style={{ flexGrow: element.width, position: 'relative' }}>
                  <Box
                    style={{
                      width: 1,
                      backgroundColor: 'white',
                      height: tickHeightX,
                      position: 'absolute',
                      right: 0,
                    }}
                  />
                  <Typography
                    style={{
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'right',
                      paddingRight: tickHeightX,
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem',
                    }}
                  >
                    {element.label}
                  </Typography>
                </div>
              ))}
          </Row>

          <Box width={margin.right} />
        </Row>
      </Column>

      {/* Tooltip box */}
      {tooltip && stackTooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y,
            left: tooltip.x,
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -margin.top,
              ...(tooltip.side === 'right' ? { left: '1rem' } : { right: '1rem' }),
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {data[tooltip.index] &&
              stackTooltip({
                slice: {
                  index: tooltip.index,
                  stack: computeStack(tooltip.index)
                    .reverse()
                    .filter((s) => s.value !== 0),
                },
              })}
          </div>
        </div>
      )}
    </div>
  )
}

export default AreaChart
