import React, { FC, useEffect, useMemo, useRef, useState } from 'react'

// Hook to measure element size
type Size = { width: number; height: number }
function useResizeObserver(ref: React.RefObject<HTMLElement>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect
        setSize({ width, height })
      })
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return size
}

// Generates a monotone cubic spline from points
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
  // Lighten by mixing with white (255,255,255)
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
type Theme = {
  axis?: { ticks?: { text?: { fontSize?: number; fill?: string } } }
  grid?: { line?: { stroke?: string; strokeWidth?: number } }
  background?: string
}
type TooltipSlice = {
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
  theme?: Partial<Theme>
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
  theme = {},
  colors = [],
  xLabels,
  keys: propKeys,
  valueFormat = (v) => String(v),
  margin: propMargin = { top: 20, right: 25, bottom: 80, left: 70 },
  axisBottom = {},
  enableGridY = true,
  axisLeft = {},
  stackTooltip,
  height: fallbackHeight = 300,
  showGlobalBaseline = false,
  showIndividualBaselines = false,
  minYValue = 0,
}) => {
  const mergedTheme = useMemo<Theme>(() => ({ background: 'transparent', ...theme }), [theme])
  const containerRef = useRef<HTMLDivElement>(null)
  const { width: w, height: h } = useResizeObserver(containerRef)
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null)

  const margin = propMargin
  const innerW = (w || 0) - margin.left - margin.right
  const innerH = (h || fallbackHeight) - margin.top - margin.bottom

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

  // apply minYValue floor
  const minY = minYValue
  const maxY = Math.max(rawMaxY, minY)
  const domain = maxY - minY

  const xScale = (i: number) => margin.left + (i / (data.length - 1)) * innerW
  const yScale = (y: number) =>
    // clamp y into [minY, maxY]
    margin.top + innerH - ((Math.max(y, minY) - minY) / domain) * innerH

  const {
    format: fmtX = (i) => (xLabels && xLabels.length === data.length ? xLabels[i] : String(i)),
    tickRotation = -45,
    tickSize = 8,
    tickPadding: tpX = 5,
  } = axisBottom
  const { format: fmtY = (v) => String(v), tickSize: tsY = 2, tickPadding: tpY = 4 } = axisLeft

  const yTicks = useMemo(() => {
    if (!layers.length) return []
    const count = 10
    const raw = (maxY - minY) / count
    const mag = 10 ** Math.floor(Math.log10(raw))
    const norm = raw / mag
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
    const step = nice * mag
    // build ticks between minY and maxY
    const startTick = Math.ceil(minY / step) * step
    const endTick = Math.floor(maxY / step) * step
    return Array.from({ length: Math.floor((endTick - startTick) / step) + 1 }, (_, i) => startTick + i * step)
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

  // Global baseline trendline (white), adjusted for "expand" mode
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

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: h ? '100%' : `${fallbackHeight}px` }}>
      {w > 0 && (
        <svg
          width={w}
          height={h}
          style={{ background: mergedTheme.background }}
          onMouseLeave={() => {
            setTooltip(null)
          }}
          onMouseMove={(e) => {
            const rect = containerRef.current?.getBoundingClientRect()
            if (!rect) return

            const y = e.clientY - rect.top
            if (y < margin.top || y > margin.top + innerH) {
              setTooltip(null)
            }
          }}
        >
          {/* clip everything to the chart-area */}
          <defs>
            <clipPath id="chart-area">
              <rect x={margin.left} y={margin.top} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {enableGridY &&
            yTicks.map((yt, i) => (
              <line
                key={i}
                x1={margin.left}
                x2={margin.left + innerW}
                y1={yScale(yt)}
                y2={yScale(yt)}
                stroke={mergedTheme.grid?.line?.stroke}
                strokeWidth={mergedTheme.grid?.line?.strokeWidth}
              />
            ))}
          {/* Y Axis */}
          {yTicks.map((yt, i) => (
            <g key={i}>
              <line
                x1={margin.left - tsY}
                x2={margin.left}
                y1={yScale(yt)}
                y2={yScale(yt)}
                stroke={mergedTheme.axis?.ticks?.text?.fill}
              />
              <text
                x={margin.left - tsY - tpY}
                y={yScale(yt) + 4}
                fontSize={mergedTheme.axis?.ticks?.text?.fontSize}
                fill={mergedTheme.axis?.ticks?.text?.fill}
                textAnchor="end"
              >
                {fmtY(yt)}
              </text>
            </g>
          ))}
          {/* X Axis */}
          {data.map((_, i) => {
            const x = xScale(i)
            const label = fmtX(i)
            if (label === '') return null
            return (
              <g key={i} transform={`translate(${x},${margin.top + innerH})`}>
                <line y2={tickSize} stroke={mergedTheme.axis?.ticks?.text?.fill} />
                <text
                  x={-tpX}
                  y={tickSize + tpX}
                  transform={`rotate(${tickRotation})`}
                  fontSize={mergedTheme.axis?.ticks?.text?.fontSize}
                  fill={mergedTheme.axis?.ticks?.text?.fill}
                  textAnchor="end"
                >
                  {fmtX(i)}
                </text>
              </g>
            )
          })}
          {/* draw all areas & baselines inside the clip */}
          <g clipPath="url(#chart-area)">
            {/* Layers */}
            {layers.map((layer, li) => (
              <path key={ordered[li]} d={buildPath(layer)} fill={getColor(ordered[li])} stroke="none" />
            ))}
            {/* Baselines */}
            {/* Baselines */}
            {/* Baseline overlays */}
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
          </g>
          {/* Interaction zones */}
          {data.map((_, i) => {
            const isFirst = i === 0
            const isLast = i === data.length - 1

            const edgePad = 20
            const x0 = isFirst ? margin.left - edgePad : xScale(i - 1)
            const x1 = isLast ? xScale(i) + edgePad : xScale(i)

            return (
              <rect
                key={i}
                x={x0}
                y={margin.top}
                width={x1 - x0}
                height={innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect()
                  if (rect) setTooltip({ index: i, x: e.clientX - rect.left, y: e.clientY - rect.top })
                }}
              />
            )
          })}
          {/* Tooltip line */}
          {tooltip && (
            <line
              x1={margin.left + (tooltip.index / (data.length - 1)) * innerW}
              x2={margin.left + (tooltip.index / (data.length - 1)) * innerW}
              y1={margin.top}
              y2={margin.top + innerH}
              stroke={mergedTheme.axis?.ticks?.text?.fill}
              strokeDasharray="4 2"
            />
          )}
        </svg>
      )}
      {/* Tooltip box */}
      {tooltip &&
        stackTooltip &&
        (() => {
          // decide which side of the chart we're on
          const isLeftSide = tooltip.x < w / 2

          return (
            <div
              style={{
                position: 'absolute',
                top: tooltip.y + 10,
                // pin left or right depending on cursor position
                ...(isLeftSide ? { left: tooltip.x + 10 } : { right: w - tooltip.x + 10 }),
                pointerEvents: 'none',
                whiteSpace: 'nowrap', // prevent wrapping/shrinking
                zIndex: 100,
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
          )
        })()}
    </div>
  )
}

export default CustomChart
