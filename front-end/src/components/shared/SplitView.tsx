import { FC, ReactNode } from 'react'
import { default as styled } from 'styled-components'

import { Column, MaxSpaceNoOverflow } from './Layout'

export const SplitViewContainer = styled(MaxSpaceNoOverflow)<{ $split: 'horizontal' | 'vertical' }>`
  display: flex;
  flex-direction: ${(props) => (props.$split === 'horizontal' ? 'row' : 'column')};
  overflow-y: ${(props) => (props.$split === 'vertical' ? 'visible' : 'hidden')};
`

export const SplitViewPanel = styled(Column)<{
  $split: 'horizontal' | 'vertical'
  $grow: boolean | number
  $scroll: boolean
}>`
  height: ${(props) => (props.$split === 'horizontal' ? '100%' : undefined)};
  width: ${(props) => (props.$split === 'vertical' ? '100%' : undefined)};
  flex-grow: ${(props) => (typeof props.$grow === 'number' ? props.$grow : props.$grow ? 1 : 0)};
  flex-shrink: ${(props) => (props.$split === 'horizontal' ? 1 : 0)};
  overflow-y: ${(props) =>
    props.$split === 'horizontal' && props.$scroll
      ? 'auto'
      : props.$split === 'vertical' && props.$grow
        ? 'visible'
        : 'hidden'};
  overflow-x: ${(props) =>
    props.$split === 'vertical' && props.$scroll
      ? 'auto'
      : props.$split === 'horizontal' && props.$grow
        ? 'visible'
        : 'hidden'};
`

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
        style={{ flexShrink: 0, backgroundColor: 'rgba(128, 128, 128, 0.04)' }}
      >
        {second}
      </SplitViewPanel>
    </SplitViewContainer>
  )
}

export default SplitView
