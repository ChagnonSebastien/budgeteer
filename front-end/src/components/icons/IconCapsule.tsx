import { CSSProperties, useContext, useMemo } from 'react'
import styled from 'styled-components'

import { IconToolsContext } from './IconTools'
import '../../styles/ui-components-tailwind.css'

const regexp = new RegExp('^(?<comp>[0-9.]+) *(?<unit>[a-z]*)$')

type Props = {
  iconName: string
  size: string | number
  color: string
  backgroundColor: string
} & CSSProperties

const CapsuleContainer = styled.div<{ $size: string | number; $sizeNumber: number; $unit: string }>`
  border-radius: ${(props) => `${props.$sizeNumber * 0.5}${props.$unit}`};
  height: ${(props) => props.$size};
  width: ${(props) => props.$size};
`

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
    <CapsuleContainer $size={size} $sizeNumber={sizeNumber} $unit={unit} className="icon-capsule" style={style}>
      <Icon size={`${sizeNumber * 0.625}${unit}`} color={color} />
    </CapsuleContainer>
  )
}

export default IconCapsule
