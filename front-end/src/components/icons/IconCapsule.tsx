import { useContext, useMemo } from 'react'
import { default as styled } from 'styled-components'

import { IconToolsContext } from './IconTools'

const regexp = new RegExp('^(?<comp>[0-9.]+) *(?<unit>[a-z]*)$')

export type IconProperties = {
  iconName: string
  color: string
  backgroundColor: string
}

type Props = {
  size?: string | number
  border?: string
} & IconProperties

const CapsuleContainer = styled.div<{ $size: string | number; $sizeNumber: number; $unit: string }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: ${(props) => `${props.$sizeNumber * 0.5}${props.$unit}`};
  height: ${(props) => props.$size};
  width: ${(props) => props.$size};
`

const IconCapsule = (props: Props) => {
  const { iconName, size = '1rem', color, border, backgroundColor } = props

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
    <CapsuleContainer $size={size} $sizeNumber={sizeNumber} $unit={unit} style={{ border, backgroundColor }}>
      <Icon size={`${sizeNumber * 0.625}${unit}`} color={color} />
    </CapsuleContainer>
  )
}

export default IconCapsule
