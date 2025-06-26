import React from 'react'

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
  styles?: {
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

  const coloredTrackStyle = error
    ? {
        backgroundColor: 'rgba(214,0,11,0.5)',
        borderLeft: '1px solid rgba(214,0,11,0.5)',
        borderRight: '1px solid rgba(214,0,11,0.5)',
      }
    : {
        backgroundColor: 'rgba(98, 203, 102, 0.5)',
        borderLeft: '1px solid #62CB66',
        borderRight: '1px solid #62CB66',
      }

  if (styles) {
    if (error) {
      return { ...basicStyle, ...styles.error }
    } else {
      return { ...basicStyle, ...styles.valid }
    }
  }

  return { ...basicStyle, ...coloredTrackStyle }
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
  disabled = false,
  styles = {
    error: {
      backgroundColor: 'rgba(214,0,11,0.5)',
      borderLeft: '1px solid rgba(214,0,11,0.5)',
      borderRight: '1px solid rgba(214,0,11,0.5)',
    },
    valid: {
      backgroundColor: 'rgba(98, 203, 102, 0.5)',
      borderLeft: '1px solid #62CB66',
      borderRight: '1px solid #62CB66',
    },
  },
}) => (
  <div
    className={`react_time_range__track${disabled ? '__disabled' : ''}`}
    style={getTrackConfig({ error, source, target, disabled, styles })}
    {...getTrackProps()}
  />
)

export default Track
