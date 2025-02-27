import { FC, ReactNode } from 'react'
import styled from 'styled-components'

import '../styles/layout-components-tailwind.css'

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

const SplitViewContainer = styled.div<{ $split: 'horizontal' | 'vertical' }>`
  height: 100%;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: ${(props) => (props.$split === 'horizontal' ? 'row' : 'column')};
`

const SplitViewPanel = styled.div<{
  $split: 'horizontal' | 'vertical'
  $grow: boolean | number
  $scroll: boolean
}>`
  height: ${(props) => (props.$split === 'horizontal' ? '100%' : 'auto')};
  width: ${(props) => (props.$split === 'vertical' ? '100%' : 'auto')};
  overflow: hidden;
  flex-grow: ${(props) => (typeof props.$grow === 'number' ? props.$grow : props.$grow ? 1 : 0)};
  overflow-y: ${(props) => (props.$split === 'horizontal' && props.$scroll ? 'scroll' : 'hidden')};
  overflow-x: ${(props) => (props.$split === 'vertical' && props.$scroll ? 'scroll' : 'hidden')};
`

const SplitView: FC<Props> = (props) => {
  const { split = 'horizontal', first, second, firstZoneStyling, secondZoneStyling } = props

  return (
    <SplitViewContainer $split={split} className={`split-view-container ${split}`}>
      <SplitViewPanel
        $split={split}
        $grow={firstZoneStyling.grow}
        $scroll={firstZoneStyling.scroll}
        className={`split-view-panel ${split} ${firstZoneStyling.scroll ? `scroll-${split}` : ''} ${firstZoneStyling.grow ? 'grow' : ''}`}
      >
        {first}
      </SplitViewPanel>
      <SplitViewPanel
        $split={split}
        $grow={secondZoneStyling.grow}
        $scroll={secondZoneStyling.scroll}
        className={`split-view-panel ${split} ${secondZoneStyling.scroll ? `scroll-${split}` : ''} ${secondZoneStyling.grow ? 'grow' : ''}`}
      >
        {second}
      </SplitViewPanel>
    </SplitViewContainer>
  )
}

export default SplitView
