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

type Bucket = { values: Record<string, { amount: number; baseline?: number }>; baseline?: number }

type Margin = { top: number; right: number; bottom: number; left: number }
type AxisBottom = { format?: (i: number) => string; tickRotation?: number; tickSize?: number; tickPadding?: number }
type AxisLeft = { format?: (v: number) => string; tickSize?: number; tickPadding?: number }
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
  xLabels?: string[]
  keys?: string[]
  valueFormat?: (v: number) => string
  margin?: Margin
  axisBottom?: AxisBottom
  enableGridY?: boolean
  axisLeft?: AxisLeft
  stackTooltip?: (tooltipProps: TooltipSlice) => React.ReactNode
  height?: number
  showGlobalBaseline?: boolean
  showIndividualBaselines?: boolean
  minYValue?: number
}

const CustomChart: FC<Props> = ({
  data,
  order = 'normal',
  offsetType = 'normal',
  colors = [],
  xLabels,
  keys: propKeys,
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

  const labels = useMemo(() => {
    if (propKeys && propKeys.length) return propKeys
    const s = new Set<string>()
    data.forEach((b) => Object.keys(b.values).forEach((k) => s.add(k)))
    return Array.from(s)
  }, [data, propKeys])
  const ordered = order === 'reverse' ? [...labels].reverse() : labels

  const series = useMemo<number[][]>(
    () => ordered.map((key) => data.map((b) => b.values[key]?.amount || 0)),
    [data, ordered],
  )

  const layers = useMemo<[number, number][][]>(() => {
    const offsets = Array(data.length).fill(0)
    if (offsetType === 'expand') {
      const totals = data.map((_, i) => series.reduce((sum, s) => sum + s[i], 0))
      return series.map((serie) =>
        serie.map((v, i) => {
          const y0 = offsets[i]
          const val = totals[i] > 0 ? v / totals[i] : 0
          const y1 = y0 + val
          offsets[i] = y1
          return [y0, y1] as [number, number]
        }),
      )
    }
    return series.map((serie) =>
      serie.map((v, i) => {
        const y0 = offsets[i]
        offsets[i] += v
        return [y0, offsets[i]] as [number, number]
      }),
    )
  }, [series, offsetType, data.length])

  const rawMaxY = useMemo(() => {
    if (offsetType === 'expand') {
      // in expand mode, baseline may exceed total fraction; compute normalized baseline fractions
      let maxFrac = 1
      // compute column totals
      const totals = data.map((_, i) => series.reduce((sum, s) => sum + s[i], 0))
      ordered.forEach((key, li) => {
        layers[li].forEach((_, i) => {
          const bl = data[i].values[key]?.baseline
          if (bl != null) {
            const frac = totals[i] ? bl / totals[i] : 0
            if (frac > maxFrac) maxFrac = frac
          }
        })
      })
      return maxFrac
    } else {
      // normal stacking: start from top of last layer
      let m = layers.length > 0 ? Math.max(0, ...layers[layers.length - 1].map(([, y1]) => y1)) : 0
      // also consider any baseline that may sit above the stack bottom
      ordered.forEach((key, li) => {
        layers[li].forEach(([y0], i) => {
          const bl = data[i].values[key]?.baseline
          if (bl != null) {
            m = Math.max(m, y0 + bl)
          }
        })
      })
      return m
    }
  }, [data, series, layers, ordered, offsetType])

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
  const yScale = (y: number) =>
    // clamp y into [minY, maxY]
    1000 - ((Math.max(y, minY) - minY) / domain) * 1000

  const { format: fmtX = (i) => (xLabels && xLabels.length === data.length ? xLabels[i] : String(i)), tickSize = 8 } =
    axisBottom
  const { format: fmtY = (v) => String(v) } = axisLeft

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
  }, [layers, maxY])

  const getColor = (id: string) => {
    return labels.indexOf(id) !== -1 ? colors[labels.indexOf(id) % colors.length] : '#ccc'
  }

  const buildPath = (layer: [number, number][]) => {
    const bot = layer.map(([y0], i) => [xScale(i), yScale(y0)] as [number, number])
    const top = layer.map(([, y1], i) => [xScale(i), yScale(y1)] as [number, number])
    const rev = [...top].reverse() as [number, number][]
    return `${monotoneSpline(bot)} L${rev[0][0]},${rev[0][1]} ${monotoneSpline(rev).slice(1)} Z`
  }

  // Baseline paths per label aligned with stacked bottom of each area
  // Baseline paths per label aligned with stacked bottom of each area
  // Baseline paths per label aligned with stacked bottom of each area, only where amount > 0
  const baselinePaths = useMemo<Record<string, string>>(() => {
    const paths: Record<string, string> = {}

    // if we're in "expand" mode, precompute each column's total
    const totals = offsetType === 'expand' ? data.map((_, i) => series.reduce((sum, s) => sum + s[i], 0)) : []

    ordered.forEach((key, li) => {
      const y0s = layers[li].map(([y0]) => y0)
      const pts: [number, number][] = []

      data.forEach((b, i) => {
        const val = b.values[key]?.amount || 0
        const bl = b.values[key]?.baseline
        if (bl != null && val > 0 && bl !== val) {
          // if expanded, convert baseline to a fraction of the column total
          const offsetBaseline = offsetType === 'expand' ? bl / (totals[i] || 1) : bl

          pts.push([xScale(i), yScale(y0s[i] + offsetBaseline)])
        }
      })

      if (pts.length > 1) {
        paths[key] = monotoneSpline(pts)
      }
    })

    return paths
  }, [data, ordered, layers, series, offsetType, xScale, yScale])

  const globalBaselinePath = useMemo<string>(() => {
    const pts: [number, number][] = []
    // when in expand mode, compute each column’s total so we can normalize
    const totals = offsetType === 'expand' ? data.map((_, i) => series.reduce((sum, s) => sum + s[i], 0)) : []

    data.forEach((b, i) => {
      if (b.baseline != null) {
        // normalize baseline when spread
        const bl = offsetType === 'expand' ? b.baseline / (totals[i] || 1) : b.baseline

        pts.push([xScale(i), yScale(bl)])
      }
    })

    return pts.length > 1 ? monotoneSpline(pts) : ''
  }, [data, offsetType, series, xScale, yScale])

  const computeStack = (idx: number) =>
    ordered.map((key, li) => {
      const value = series[li][idx]
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
          const sliceWidth = boundingRect.width / data.length
          const index = Math.floor((e.clientX - boundingRect.left) / sliceWidth)
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
          <path key={ordered[li]} d={buildPath(layer)} fill={getColor(ordered[li])} stroke="none" />
        ))}

        {/* Baselines */}
        {showIndividualBaselines &&
          layers.map((_, li) => {
            const key = ordered[li]
            const path = baselinePaths[key]
            if (!path) return null
            const areaColor = getColor(key)
            const baselineColor = brighten(areaColor)
            return (
              <path
                key={`${key}-baseline`}
                d={path}
                fill="none"
                stroke={baselineColor}
                strokeWidth={2}
                strokeDasharray="10 4"
              />
            )
          })}

        {/* Global baseline trendline */}
        {showGlobalBaseline && globalBaselinePath && (
          <path d={globalBaselinePath} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 4" />
        )}
      </svg>
    ),
    [
      showGlobalBaseline,
      globalBaselinePath,
      layers,
      ordered,
      buildPath,
      getColor,
      brighten,
      showIndividualBaselines,
      baselinePaths,
    ],
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
              <div style={{ position: 'relative', flexGrow: i === 0 ? startTick - minY : step }}>
                <Box style={{ width: tickSize, borderTop: '1px solid white', position: 'absolute', right: 0 }} />
                <Typography
                  style={{
                    transform: `translate(-${tickSize + 5}px, -50%)`,
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
                  width: (tooltip.index + 1) * tooltip.slice,
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
                <div style={{ position: 'relative', flexGrow: i === 0 ? startTick - minY : step }}>
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
                prev[prev.length - 1].width += 1
                return prev
              }, [])
              .map((element) => (
                <div key={element.label} style={{ flexGrow: element.width, position: 'relative' }}>
                  <Box style={{ height: tickSize, borderRight: '1px solid white' }} />
                  <Typography
                    style={{
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'right',
                      paddingRight: tickSize,
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
            {stackTooltip({
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

export default CustomChart
