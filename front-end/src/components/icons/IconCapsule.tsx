import { styled } from '@mui/material/styles'
import { useContext, useMemo } from 'react'

import { IconToolsContext } from './IconTools'

const regexp = new RegExp('^(?<comp>[0-9.]+) *(?<unit>[a-z]*)$')

export type IconProperties = {
  iconName: string
  color: string
  backgroundColor: string
}

type Props = {
  size?: string | number
  bordered?: boolean
} & IconProperties

const CapsuleContainer = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{
  $size: string | number
  $sizeNumber: number
  $unit: string
  $bordered: boolean
}>(({ theme, $size, $sizeNumber, $unit, $bordered }) => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: `${$sizeNumber * 0.5}${$unit}`,
  height: $size,
  width: $size,
  border: $bordered ? `1px solid ${theme.palette.border.strong}` : undefined,
}))

const IconCapsule = (props: Props) => {
  const { iconName, size = '1rem', color, bordered = false, backgroundColor } = props

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
    <CapsuleContainer
      $size={size}
      $sizeNumber={sizeNumber}
      $unit={unit}
      $bordered={bordered}
      style={{ backgroundColor }}
    >
      <Icon size={`${sizeNumber * 0.625}${unit}`} color={color} />
    </CapsuleContainer>
  )
}

export default IconCapsule
