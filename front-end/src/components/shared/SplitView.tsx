import { styled } from '@mui/material/styles'
import { FC, ReactNode } from 'react'

import { Column, MaxSpaceNoOverflow, withoutTransientProps } from './Layout'

export const SplitViewContainer = styled(
  MaxSpaceNoOverflow,
  withoutTransientProps,
)<{
  $split: 'horizontal' | 'vertical'
}>(({ $split }) => ({
  display: 'flex',
  flexDirection: $split === 'horizontal' ? 'row' : 'column',
  overflowY: $split === 'vertical' ? 'visible' : 'hidden',
}))

export const SplitViewPanel = styled(
  Column,
  withoutTransientProps,
)<{
  $split: 'horizontal' | 'vertical'
  $grow: boolean | number
  $scroll: boolean
}>(({ $split, $grow, $scroll }) => ({
  height: $split === 'horizontal' ? '100%' : undefined,
  width: $split === 'vertical' ? '100%' : undefined,
  flexGrow: typeof $grow === 'number' ? $grow : $grow ? 1 : 0,
  flexShrink: $split === 'horizontal' ? 1 : 0,
  overflowY: $split === 'horizontal' && $scroll ? 'auto' : $split === 'vertical' && $grow ? 'visible' : 'hidden',
  overflowX: $split === 'vertical' && $scroll ? 'auto' : $split === 'horizontal' && $grow ? 'visible' : 'hidden',
}))

interface ZoneStyling {
  grow: boolean | number
  scroll: boolean
}

interface Props {
  split?: 'horizontal' | 'vertical'
  first: ReactNode
  firstZoneStyling: ZoneStyling
  second: ReactNode
  secondZoneStyling: ZoneStyling
}

const SplitView: FC<Props> = (props) => {
  const { split = 'horizontal', first, second, firstZoneStyling, secondZoneStyling } = props

  return (
    <SplitViewContainer $split={split}>
      <SplitViewPanel $split={split} $grow={firstZoneStyling.grow} $scroll={firstZoneStyling.scroll}>
        {first}
      </SplitViewPanel>
      <SplitViewPanel
        $split={split}
        $grow={secondZoneStyling.grow}
        $scroll={secondZoneStyling.scroll}
        sx={{ flexShrink: 0, bgcolor: 'surface.subtle' }}
      >
        {second}
      </SplitViewPanel>
    </SplitViewContainer>
  )
}

export default SplitView
