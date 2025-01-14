import React from 'react'

interface SliderRailProps {
  getRailProps: () => object
  className?: string
}

export const SliderRail: React.FC<SliderRailProps> = ({ getRailProps, className = '' }) => (
  <>
    <div className={`react_time_range__rail__outer ${className}`.trim()} {...getRailProps()} />
    <div className="react_time_range__rail__inner" />
  </>
)

export default SliderRail
