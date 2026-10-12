import { useTheme } from '@mui/material'
import React from 'react'

interface TrackStyle {
  backgroundColor: string
  borderLeft: string
  borderRight: string
}

interface getTrackConfigArgs {
  error?: boolean
  source: {
    value: number
    percent: number
  }
  target: {
    value: number
    percent: number
  }
  disabled?: boolean
  styles: {
    error: object
    valid: object
  }
}

const getTrackConfig = ({ error, source, target, disabled, styles }: getTrackConfigArgs) => {
  const basicStyle = {
    left: `${source.percent}%`,
    width: `calc(${target.percent - source.percent}% - 1px)`,
  }

  if (disabled) return basicStyle
  return { ...basicStyle, ...(error ? styles.error : styles.valid) }
}

interface TrackProps {
  error?: boolean
  source: {
    value: number
    percent: number
  }
  target: {
    value: number
    percent: number
  }
  getTrackProps: () => object
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>
  disabled?: boolean
  styles?: {
    error: object
    valid: object
  }
}

const Track: React.FC<TrackProps> = ({
  error,
  source,
  target,
  getTrackProps,
  onPointerDown,
  disabled = false,
  styles,
}) => {
  const { slider } = useTheme().palette
  const edge = (color: string): TrackStyle => ({
    backgroundColor: color,
    borderLeft: `1px solid ${color}`,
    borderRight: `1px solid ${color}`,
  })
  const trackStyles = styles ?? {
    error: edge(slider.invalid),
    valid: {
      ...edge(slider.valid),
      borderLeft: `1px solid ${slider.validEdge}`,
      borderRight: `1px solid ${slider.validEdge}`,
    },
  }

  return (
    <div
      className={`react_time_range__track${disabled ? '__disabled' : ''}`}
      style={{
        ...getTrackConfig({ error, source, target, disabled, styles: trackStyles }),
        ...(onPointerDown && { cursor: 'grab', touchAction: 'pan-y' }),
      }}
      {...(onPointerDown ? { onPointerDown } : getTrackProps())}
    />
  )
}

export default Track
