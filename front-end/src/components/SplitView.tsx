import { FC, ReactNode } from 'react'

interface ZoneStyling {
  grow: boolean
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
    <div
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: split === 'horizontal' ? 'row' : 'column',
      }}
    >
      <div
        style={{
          height: split === 'horizontal' ? '100%' : undefined,
          width: split === 'vertical' ? '100%' : undefined,
          overflow: 'hidden',
          flexGrow: firstZoneStyling.grow ? 1 : 0,
          overflowY: split === 'horizontal' && firstZoneStyling.scroll ? 'scroll' : 'hidden',
          overflowX: split === 'vertical' && firstZoneStyling.scroll ? 'scroll' : 'hidden',
        }}
      >
        {first}
      </div>
      <div
        style={{
          height: split === 'horizontal' ? '100%' : undefined,
          width: split === 'vertical' ? '100%' : undefined,
          overflow: 'hidden',
          flexGrow: secondZoneStyling.grow ? 1 : 0,
          overflowY: split === 'horizontal' && firstZoneStyling.scroll ? 'scroll' : 'hidden',
          overflowX: split === 'vertical' && firstZoneStyling.scroll ? 'scroll' : 'hidden',
        }}
      >
        {second}
      </div>
    </div>
  )
}

export default SplitView
