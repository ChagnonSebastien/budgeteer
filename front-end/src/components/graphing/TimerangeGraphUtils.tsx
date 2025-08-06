import { Box, Typography } from '@mui/material'
import { addDays, isBefore, isSameDay } from 'date-fns'
import React, { Dispatch, FC, ReactNode, SetStateAction, useMemo } from 'react'

import { Column, Row } from '../shared/Layout'

export function monotoneSpline(pts: [number, number][]): string {
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

export type MarginConfig = { top: number; right: number; bottom: number; left: number }
export type AxisConfig = { tickSize: number; tickPadding: number; grid: boolean }
export type DateAxisConfig = AxisConfig & { format: (date: Date) => string }
export type ValueAxisConfig = AxisConfig & { format: (i: number) => string; nice: boolean }

export const useValueAxisConfiguration = (dataMinY: number, dataMaxY: number, scaleToNice: boolean) =>
  useMemo(() => {
    const count = 10
    const raw = (dataMaxY - dataMinY) / count
    const mag = 10 ** Math.floor(Math.log10(raw))
    const norm = raw / mag
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
    const step = nice * mag

    const graphMinY = scaleToNice ? Math.floor(dataMinY / step) * step : dataMinY
    const graphMaxY = scaleToNice ? Math.ceil(dataMaxY / step) * step : dataMaxY

    return {
      step,
      graphMinY,
      graphMaxY,
      startTick: Math.ceil(graphMinY / step) * step,
      endTick: Math.floor(graphMaxY / step) * step,
    }
  }, [dataMinY, dataMaxY, scaleToNice])

const useDateSubdivisions = (range: [Date, Date], config: DateAxisConfig) =>
  useMemo(() => {
    const sections = []
    for (let date = range[0]; isBefore(date, range[1]) || isSameDay(date, range[1]); date = addDays(date, 1)) {
      if (sections.length === 0 || sections[sections.length - 1].label !== '') {
        sections.push({ width: 0, label: '' })
      }
      const label = config.format!(date)
      if (label) {
        sections[sections.length - 1].label = label
      }
      if (!isSameDay(date, range[0])) sections[sections.length - 1].width += 1
    }
    return sections
  }, [range, config])

export const XDateGrid: FC<{ range: [Date, Date]; height: number; config: DateAxisConfig }> = (props) => {
  const xSubdivisions = useDateSubdivisions(props.range, props.config)

  return (
    <Row
      style={{
        position: 'absolute',
        height: '100%',
        width: '100%',
      }}
    >
      {xSubdivisions.map((element) => (
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
  )
}

export const BottomDateAxis: FC<{ range: [Date, Date]; height: number; config: DateAxisConfig }> = (props) => {
  const xSubdivisions = useDateSubdivisions(props.range, props.config)

  return (
    <Row style={{ height: props.height, flexGrow: 1 }}>
      {xSubdivisions.map((element) => (
        <div key={`x-label-${element.label}`} style={{ flexGrow: element.width, position: 'relative' }}>
          {element.label && (
            <>
              <Box
                style={{
                  width: 1,
                  backgroundColor: 'white',
                  height: props.config.tickSize,
                  position: 'absolute',
                  right: 0,
                }}
              />
              <Typography
                style={{
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'right',
                  paddingRight: props.config.tickSize,
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                }}
              >
                {element.label}
              </Typography>
            </>
          )}
        </div>
      ))}
    </Row>
  )
}

export type TooltipDefinition = {
  index: number
  x: number
  y: number
  side: 'left' | 'right'
  slice: number
}

export const DateBasedGraph = (props: {
  margin: MarginConfig
  yAxisValues: {
    step: number
    graphMinY: number
    graphMaxY: number
    startTick: number
    endTick: number
  }
  graph: ReactNode
  Tooltip?: FC<{ def: TooltipDefinition }>
  tooltip: TooltipDefinition | null
  setTooltip: Dispatch<SetStateAction<TooltipDefinition | null>>
  xAxisConfig?: Partial<DateAxisConfig>
  yAxisConfig?: Partial<ValueAxisConfig>
  range: [Date, Date]
  datasetLength: number
}) => {
  const {
    margin,
    yAxisValues,
    graph,
    Tooltip,
    tooltip,
    setTooltip,
    xAxisConfig = {},
    yAxisConfig = {},
    range,
    datasetLength,
  } = props
  const { step, graphMinY, graphMaxY, startTick, endTick } = yAxisValues

  const { format: fmtX = (i) => String(i), tickSize: tickHeightX = 5, grid: gridX = false } = xAxisConfig
  const { format: fmtY = (v) => String(v), tickSize: tickSizeY = 5, grid: gridY = false } = yAxisConfig

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
              <div
                key={`y-label-${i}`}
                style={{ position: 'relative', flexGrow: i === 0 ? (startTick - graphMinY) / step : 1 }}
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
                  {fmtY(startTick + i * step)}
                </Typography>
              </div>
            ))}
            <div style={{ flexGrow: (graphMaxY - endTick) / step }} />
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
                  borderRight: '2px dashed rgba(255, 255, 255, 0.5)',
                  pointerEvents: 'none',
                }}
              />
            )}

            {gridX && (
              <XDateGrid
                range={range}
                height={margin.bottom}
                config={{
                  format: fmtX,
                  tickSize: tickHeightX,
                  tickPadding: 1,
                  grid: gridX,
                }}
              />
            )}

            {gridY && (
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
                  <div
                    key={`y-grid-${i}`}
                    style={{ position: 'relative', flexGrow: i === 0 ? (startTick - graphMinY) / step : 1 }}
                  >
                    <Box
                      style={{ width: '100%', borderTop: '1px solid rgba(128, 128, 128, 0.2)', position: 'absolute' }}
                    />
                  </div>
                ))}
                <div style={{ flexGrow: (graphMaxY - endTick) / step }} />
              </Column>
            )}
          </div>

          <Box
            width={margin.right}
            onMouseMove={(e) =>
              setTooltip((prev) =>
                prev
                  ? {
                      ...prev,
                      index: datasetLength - 1,
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

          <BottomDateAxis
            range={range}
            height={margin.bottom}
            config={{
              format: fmtX,
              tickSize: tickHeightX,
              tickPadding: 1,
              grid: gridX,
            }}
          />

          <Box width={margin.right} />
        </Row>
      </Column>

      {/* Tooltip box */}
      {tooltip && Tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y,
            left: tooltip.x,
            zIndex: 1100,
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
            <Tooltip def={tooltip} />
          </div>
        </div>
      )}
    </div>
  )
}
