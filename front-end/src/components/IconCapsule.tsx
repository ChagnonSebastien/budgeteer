import { CSSProperties, useContext, useMemo } from 'react'

import { IconToolsContext } from './IconTools'

const regexp = new RegExp('^(?<comp>[0-9.]+) *(?<unit>[a-z]*)$')

type Props = {
  iconName: string
  size: string | number
  color: string
  backgroundColor: string
} & CSSProperties

const IconCapsule = (props: Props) => {
  const { iconName, size, color, ...style } = props

  const { iconTypeFromName } = useContext(IconToolsContext)

  const Icon = useMemo(() => iconTypeFromName(iconName), [iconName, iconTypeFromName])

  const { sizeNumber, unit } = useMemo(() => {
    if (typeof size === 'number') {
      return { sizeNumber: size, unit: '' }
    } else {
      const match = regexp.exec(size)
      if (match === null) {
        return { sizeNumber: 1, unit: 'rem' }
      }

      const groups = match.groups!
      return { sizeNumber: parseFloat(groups['comp']), unit: groups['unit'] }
    }
  }, [size])

  return (
    <div
      style={{
        borderRadius: `${sizeNumber * 0.5}${unit}`,
        height: size,
        width: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <Icon size={`${sizeNumber * 0.625}${unit}`} color={color} />
    </div>
  )
}

export default IconCapsule
