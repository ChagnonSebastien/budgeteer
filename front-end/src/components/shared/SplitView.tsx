import { FC, ReactNode } from 'react'
import { default as styled } from 'styled-components'

import { Row } from './Layout'

export const SplitViewContainer = styled.div<{ $split: 'horizontal' | 'vertical' }>`
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: ${(props) => (props.$split === 'horizontal' ? 'row' : 'column')};
`

export const SplitViewPanel = styled(Row)<{
  $split: 'horizontal' | 'vertical'
  $grow: boolean | number
  $scroll: boolean
}>`
  height: ${(props) => (props.$split === 'horizontal' ? '100%' : 'auto')};
  width: ${(props) => (props.$split === 'vertical' ? '100%' : 'auto')};
  overflow: hidden;
  flex-grow: ${(props) => (typeof props.$grow === 'number' ? props.$grow : props.$grow ? 1 : 0)};
  overflow-y: ${(props) => (props.$split === 'horizontal' && props.$scroll ? 'auto' : 'hidden')};
  overflow-x: ${(props) => (props.$split === 'vertical' && props.$scroll ? 'auto' : 'hidden')};
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
        style={{ flexShrink: 0 }}
      >
        {second}
      </SplitViewPanel>
    </SplitViewContainer>
  )
}

export default SplitView
