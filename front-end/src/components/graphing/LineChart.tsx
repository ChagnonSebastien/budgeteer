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

type DataSetLabel = string
export type Bucket = {
  date: Date
  values: Record<DataSetLabel, { amount: number }>
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
    }[]
  }
}

type Props = {
  data: Bucket[]
  colors?: string[]
  datasetsLabels?: string[]
  valueFormat?: (v: number) => string
  margin?: MarginConfig
  axisBottom?: AxisConfig
  enableGridY?: boolean
  axisLeft?: AxisConfig
  stackTooltip?: (tooltipProps: TooltipSlice) => React.ReactNode
  height?: number
}

const LineChart: FC<Props> = ({
  data,
  colors = [],
  datasetsLabels: propDatasetsLabels,
  valueFormat = (v) => String(v),
  margin = { top: 20, right: 25, bottom: 65, left: 70 },
  axisBottom = {},
  axisLeft = {},
  stackTooltip,
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

  const layers = useMemo<[number, number][][]>(() => {
    const offsets = Array(data.length).fill(0)
    return datasets.map((serie) =>
      serie.map((v, i) => {
        const y0 = offsets[i]
        offsets[i] += v
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
            dataset.reduce((prev, value) => Math.max(prev, value), Number.MIN_SAFE_INTEGER),
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
            dataset.reduce((prev, value) => Math.min(prev, value), Number.MAX_SAFE_INTEGER),
          ),
        Number.MAX_SAFE_INTEGER,
      ),
    [datasets],
  )

  const { format: fmtX = (i) => String(i), tickSize: tickHeightX = 5 } = axisBottom
  const { format: fmtY = (v) => String(v), tickSize: tickSizeY = 5 } = axisLeft

  const { step, graphMinY, graphMaxY } = useMemo(() => {
    const count = 10
    const raw = (dataMaxY - dataMinY) / count
    const mag = 10 ** Math.floor(Math.log10(raw))
    const norm = raw / mag
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
    const step = nice * mag

    const minY = Math.floor(dataMinY / step) * step
    const maxY = Math.ceil(dataMaxY / step) * step

    return {
      step,
      graphMinY: minY,
      graphMaxY: maxY,
    }
  }, [dataMinY, dataMaxY])

  const xScale = (i: number) => (i / (data.length - 1)) * 1000
  const yNormalScale = (y: number) => 1000 - ((Math.max(y, graphMinY) - graphMinY) / (graphMaxY - graphMinY)) * 1000

  const getColor = (id: string) => {
    return datasetLabels.indexOf(id) !== -1 ? colors[datasetLabels.indexOf(id) % colors.length] : '#ccc'
  }

  const buildPath = (layer: [number, number][]) => {
    const bot = layer.map(([y0], i) => [xScale(i), yNormalScale(y0)] as [number, number])
    const top = layer.map(([, y1], i) => [xScale(i), yNormalScale(y1)] as [number, number])
    const rev = [...top].reverse() as [number, number][]
    return `${monotoneSpline(bot)} L${rev[0][0]},${rev[0][1]} ${monotoneSpline(rev).slice(1)} Z`
  }

  const splines = useMemo(() => {
    return datasets.map((baselineStackedValues) => {
      const pts: [number, number][] = []
      for (let i = 0; i < baselineStackedValues.length; i += 1) {
        pts.push([xScale(i), yNormalScale(baselineStackedValues[i])])
      }
      return monotoneSpline(pts)
    })
  }, [data, datasets, xScale, yNormalScale])

  const computeStack = (idx: number) =>
    datasetLabels.map((key, li) => {
      const value = datasets[li][idx]
      return {
        layerLabel: key,
        value,
        color: getColor(key),
        formattedValue: valueFormat(value),
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
    [layers, datasetLabels, buildPath, getColor],
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
            {Array.from({ length: Math.round((graphMaxY - graphMinY) / step) + 1 }, (_, i) => (
              <div
                key={`y-label-${i}`}
                style={{ position: 'relative', flexGrow: i === 0 ? (graphMinY * 1000) % (step * 1000) : step * 1000 }}
              >
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
                  {fmtY(graphMinY + i * step)}
                </Typography>
              </div>
            ))}
            <div style={{ flexGrow: (graphMaxY * 1000) % (step * 1000) }} />
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

            <Row
              style={{
                position: 'absolute',
                height: '100%',
                width: '100%',
              }}
            >
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
                  <div key={`x-grid-${element.label}`} style={{ flexGrow: element.width, position: 'relative' }}>
                    <Box
                      style={{
                        right: 0,
                        width: 1,
                        height: '100%',
                        backgroundColor: 'rgba(128, 128, 128, 0.2)',
                        position: 'absolute',
                      }}
                    />
                  </div>
                ))}
            </Row>

            <Column
              style={{
                height: '100%',
                width: '100%',
                flexDirection: 'column-reverse',
                alignItems: 'stretch',
                zIndex: -1,
              }}
            >
              {Array.from({ length: Math.round((graphMaxY - graphMinY) / step) + 1 }, (_, i) => (
                <div
                  key={`y-grid-${i}`}
                  style={{ position: 'relative', flexGrow: i === 0 ? (graphMinY * 1000) % (step * 1000) : step * 1000 }}
                >
                  <Box
                    style={{ width: '100%', borderTop: '1px solid rgba(128, 128, 128, 0.2)', position: 'absolute' }}
                  />
                </div>
              ))}
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
                  stack: computeStack(tooltip.index).reverse(),
                },
              })}
          </div>
        </div>
      )}
    </div>
  )
}

export default LineChart
