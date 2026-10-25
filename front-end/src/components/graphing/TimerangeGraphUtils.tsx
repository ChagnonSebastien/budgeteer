import { Box, Typography, useTheme } from '@mui/material'
import { addDays, isBefore, isSameDay } from 'date-fns'
import React, {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Column, Row } from '../shared/Layout'
import { useElementDimensions } from '../shared/useDimensions'
import useWideLayout from '../shared/useWideLayout'

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
export type ValueAxisConfig = AxisConfig & { format: (i: number) => string; nice: boolean; reference?: number }

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
          <Box sx={{ right: 0, width: '1px', height: '100%', bgcolor: 'border.subtle', position: 'absolute' }} />
        </div>
      ))}
    </Row>
  )
}

// Horizontal room a rotated date label needs to stay readable next to its neighbour.
const minDateLabelSpacingPx = 36

export const BottomDateAxis: FC<{ range: [Date, Date]; height: number; config: DateAxisConfig }> = (props) => {
  const xSubdivisions = useDateSubdivisions(props.range, props.config)
  const { ref, width } = useElementDimensions(0, 0)

  const shownLabels = useMemo(() => {
    const totalDays = xSubdivisions.reduce((sum, element) => sum + element.width, 0)
    const pxPerDay = totalDays > 0 ? width / totalDays : 0
    let end = 0
    const ends = xSubdivisions.map((element) => (end += element.width * pxPerDay))
    const shown = new Set<number>()
    let lastShown = Infinity
    for (let i = xSubdivisions.length - 1; i >= 0; i--) {
      if (!xSubdivisions[i].label || lastShown - ends[i] < minDateLabelSpacingPx) continue
      shown.add(i)
      lastShown = ends[i]
    }
    return shown
  }, [xSubdivisions, width])

  return (
    <Row ref={ref} style={{ height: props.height, flexGrow: 1 }}>
      {xSubdivisions.map((element, i) => (
        <div key={`x-label-${element.label}`} style={{ flexGrow: element.width, position: 'relative' }}>
          {shownLabels.has(i) && (
            <>
              <Box
                sx={{
                  width: '1px',
                  bgcolor: 'common.white',
                  height: props.config.tickSize,
                  position: 'absolute',
                  right: 0,
                }}
              />
              <Typography
                variant="caption"
                style={{
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'right',
                  paddingRight: props.config.tickSize,
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  whiteSpace: 'nowrap',
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

const tooltipCursorGap = 16
const tooltipScreenEdge = 8

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

const ChartTooltip: FC<{ def: TooltipDefinition; offsetTop: number; children: ReactNode }> = ({
  def,
  offsetTop,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  // Runs after every render: the tooltip's size depends on the hovered data, known only once drawn.
  useLayoutEffect(() => {
    if (!ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    const maxLeft = window.innerWidth - width - tooltipScreenEdge
    const maxTop = window.innerHeight - height - tooltipScreenEdge
    const fitsRight = def.x + tooltipCursorGap + width <= window.innerWidth - tooltipScreenEdge
    const fitsLeft = def.x - tooltipCursorGap - width >= tooltipScreenEdge

    let left: number
    let top: number
    if (fitsRight || fitsLeft) {
      const onRight = def.side === 'right' ? fitsRight : !fitsLeft
      left = onRight ? def.x + tooltipCursorGap : def.x - tooltipCursorGap - width
      top = clamp(def.y - offsetTop, tooltipScreenEdge, maxTop)
    } else {
      // Too wide to sit beside the cursor: centre it under the cursor instead, or over it when there is no room below.
      const below = def.y + tooltipCursorGap
      const above = def.y - tooltipCursorGap - height
      left = clamp(def.x - width / 2, tooltipScreenEdge, maxLeft)
      top = below <= maxTop ? below : above >= tooltipScreenEdge ? above : clamp(below, tooltipScreenEdge, maxTop)
    }
    if (position?.left !== left || position?.top !== top) setPosition({ left, top })
  })

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: position?.left ?? def.x,
        top: position?.top ?? def.y,
        visibility: position ? 'visible' : 'hidden',
        zIndex: 1100,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  )
}

export type TooltipDefinition = {
  index: number
  x: number
  y: number
  side: 'left' | 'right'
  slice: number
}

// A touch keeps reporting to the plot after the finger slides past its edge: snap to the first or last point.
export const tooltipAtPointer = (e: React.PointerEvent<Element>, datasetLength: number): TooltipDefinition => {
  const boundingRect = e.currentTarget.getBoundingClientRect()
  const percentage = (e.clientX - boundingRect.left) / boundingRect.width
  const index = clamp(Math.floor(percentage * datasetLength), 0, datasetLength - 1)
  return {
    index,
    x: e.clientX,
    y: e.clientY,
    side: index < datasetLength / 2 ? 'right' : 'left',
    slice: boundingRect.width / (datasetLength - 1),
  }
}

export type DateNavigation = {
  range: [Date, Date]
  preview: (from: Date, to: Date) => [Date, Date]
  commit: () => void
}

const wheelCommitDelayMs = 250
const wheelPixelsPerDoubling = 500

const wheelPixels = (e: WheelEvent) =>
  e.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? e.deltaY * 16
    : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? e.deltaY * 400
      : e.deltaY

const useTimeNavigation = (navigation?: DateNavigation) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; start: number; end: number } | null>(null)
  // Successive wheel ticks build on the clamped range they previewed, not on a range the chart has yet to render.
  const wheelRange = useRef<[Date, Date] | null>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(navigation)
  latest.current = navigation
  const navigable = navigation !== undefined
  // Stacked above the page content, the chart must let the wheel scroll the page.
  const zoomOnWheel = useWideLayout()

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !navigable || !zoomOnWheel) return
    const zoom = (e: WheelEvent) => {
      const navigation = latest.current
      if (!navigation || e.deltaY === 0 || drag.current) return
      e.preventDefault()
      const [start, end] = (wheelRange.current ?? navigation.range).map((d) => d.getTime())
      const rect = svg.getBoundingClientRect()
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const pointer = start + ratio * (end - start)
      const span = (end - start) * 2 ** (wheelPixels(e) / wheelPixelsPerDoubling)
      wheelRange.current = navigation.preview(new Date(pointer - ratio * span), new Date(pointer + (1 - ratio) * span))
      clearTimeout(wheelTimer.current)
      wheelTimer.current = setTimeout(() => {
        wheelRange.current = null
        latest.current?.commit()
      }, wheelCommitDelayMs)
    }
    svg.addEventListener('wheel', zoom, { passive: false })
    return () => {
      svg.removeEventListener('wheel', zoom)
      clearTimeout(wheelTimer.current)
    }
  }, [navigable, zoomOnWheel])

  const endDrag = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    latest.current?.commit()
  }

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      if (!navigation || e.pointerType !== 'mouse' || e.button !== 0) return false
      clearTimeout(wheelTimer.current)
      wheelRange.current = null
      e.currentTarget.setPointerCapture(e.pointerId)
      const [start, end] = navigation.range.map((d) => d.getTime())
      drag.current = { x: e.clientX, start, end }
      setDragging(true)
      return true
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      if (!drag.current || !navigation) return false
      const { x, start, end } = drag.current
      const shift = ((e.clientX - x) / e.currentTarget.getBoundingClientRect().width) * (end - start)
      navigation.preview(new Date(start - shift), new Date(end - shift))
      return true
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  return { svgRef, dragging, navigable, dragHandlers }
}

export const GraphSvg: FC<{
  navigation?: DateNavigation
  datasetLength: number
  setTooltip: Dispatch<SetStateAction<TooltipDefinition | null>>
  children: ReactNode
}> = ({ navigation, datasetLength, setTooltip, children }) => {
  const { svgRef, dragging, navigable, dragHandlers } = useTimeNavigation(navigation)
  const showTooltipAt = (e: React.PointerEvent<SVGSVGElement>) => setTooltip(tooltipAtPointer(e, datasetLength))

  return (
    <svg
      ref={svgRef}
      preserveAspectRatio="none"
      viewBox="0 0 1000 1000"
      style={{
        height: '100%',
        width: '100%',
        position: 'absolute',
        zIndex: 1,
        touchAction: 'pan-y',
        cursor: dragging ? 'grabbing' : navigable ? 'grab' : undefined,
      }}
      onPointerMove={(e) => {
        if (!dragHandlers.onPointerMove(e)) showTooltipAt(e)
      }}
      onPointerDown={(e) => {
        if (dragHandlers.onPointerDown(e)) setTooltip(null)
        else showTooltipAt(e)
      }}
      onPointerUp={dragHandlers.onPointerUp}
      onPointerCancel={dragHandlers.onPointerCancel}
    >
      {children}
    </svg>
  )
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
  const theme = useTheme()
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

  // A finger never leaves the chart the way a mouse does: dismiss on a touch outside the plot or on scroll.
  const plotRef = useRef<HTMLDivElement>(null)
  const hasTooltip = tooltip !== null
  useEffect(() => {
    if (!hasTooltip) return
    const dismissOutside = (e: PointerEvent) => {
      if (!plotRef.current?.contains(e.target as Node)) setTooltip(null)
    }
    const dismiss = () => setTooltip(null)
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('scroll', dismiss, true)
    }
  }, [hasTooltip, setTooltip])

  const { format: fmtX = (i) => String(i), tickSize: tickHeightX = 5, grid: gridX = false } = xAxisConfig
  const { format: fmtY = (v) => String(v), tickSize: tickSizeY = 5, grid: gridY = false, reference } = yAxisConfig

  return (
    <div style={{ position: 'relative', flexGrow: 1, userSelect: 'none', WebkitUserSelect: 'none' }}>
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
          onPointerLeave={(e) => {
            if (e.pointerType === 'mouse') setTooltip(null)
          }}
        >
          <Column
            style={{ width: margin.left, flexDirection: 'column-reverse' }}
            onPointerMove={(e) =>
              e.pointerType === 'mouse' &&
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
            {Array.from({ length: Math.round((endTick - startTick) / step) + 1 }, (_, i) => (
              <div
                key={`y-label-${i}`}
                style={{ position: 'relative', flexGrow: i === 0 ? (startTick - graphMinY) / step : 1 }}
              >
                <Box
                  sx={{ width: tickSizeY, borderTop: 1, borderColor: 'common.white', position: 'absolute', right: 0 }}
                />
                <Typography
                  variant="caption"
                  style={{
                    transform: `translate(-${tickSizeY + 5}px, -50%)`,
                    transformOrigin: 'center',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {fmtY(startTick + i * step)}
                </Typography>
              </div>
            ))}
            <div style={{ flexGrow: (graphMaxY - endTick) / step }} />
          </Column>

          <div ref={plotRef} style={{ flexGrow: 1, position: 'relative' }}>
            {graph}

            {tooltip && (
              <div
                style={{
                  zIndex: 2,
                  position: 'absolute',
                  height: '100%',
                  width: tooltip.index * tooltip.slice,
                  borderRight: `2px dashed ${theme.palette.text.disabled}`,
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
                {Array.from({ length: Math.round((endTick - startTick) / step) + 1 }, (_, i) => (
                  <div
                    key={`y-grid-${i}`}
                    style={{ position: 'relative', flexGrow: i === 0 ? (startTick - graphMinY) / step : 1 }}
                  >
                    <Box sx={{ width: '100%', borderTop: 1, borderColor: 'border.subtle', position: 'absolute' }} />
                  </div>
                ))}
                <div style={{ flexGrow: (graphMaxY - endTick) / step }} />
              </Column>
            )}

            {reference !== undefined && reference >= graphMinY && reference <= graphMaxY && (
              <Box
                sx={{
                  position: 'absolute',
                  top: `${((graphMaxY - reference) / (graphMaxY - graphMinY)) * 100}%`,
                  width: '100%',
                  borderTop: 1,
                  borderColor: 'text.secondary',
                  zIndex: -1,
                }}
              />
            )}
          </div>

          <Box
            width={margin.right}
            onPointerMove={(e) =>
              e.pointerType === 'mouse' &&
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

      {tooltip && Tooltip && (
        <ChartTooltip def={tooltip} offsetTop={margin.top}>
          <Tooltip def={tooltip} />
        </ChartTooltip>
      )}
    </div>
  )
}
