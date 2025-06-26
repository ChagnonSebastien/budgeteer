import React from 'react'

interface HandleProps {
  error?: boolean
  domain: number[]
  handle: {
    id: string
    value: number
    percent: number
  }
  disabled?: boolean
  getHandleProps: (id: string) => object
  errorColor?: string
  validColor?: string
}

const Handle: React.FC<HandleProps> = ({
  error,
  domain: [min, max],
  handle: { id, value, percent = 0 },
  disabled = false,
  getHandleProps,
  errorColor = 'rgb(214, 0, 11)',
  validColor = 'rgb(98, 203, 102)',
}) => {
  const leftPosition = `${percent}%`

  const getHandleStyle = () => {
    if (disabled) return undefined
    if (error) return { backgroundColor: errorColor }
    return { backgroundColor: validColor }
  }

  return (
    <>
      <div className="react_time_range__handle_wrapper" style={{ left: leftPosition }} {...getHandleProps(id)} />
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className={`react_time_range__handle_container${disabled ? '__disabled' : ''}`}
        style={{ left: leftPosition }}
      >
        <div className={`react_time_range__handle_marker${error ? '__error' : ''}`} style={getHandleStyle()} />
      </div>
    </>
  )
}

export default Handle
