import { AppBar, IconButton, Toolbar, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, ReactNode, useContext } from 'react'
import { IconType } from 'react-icons'
import { useNavigate } from 'react-router-dom'

import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { MaxSpaceNoOverflow, withoutTransientProps } from './Layout'

export const ContentWithHeaderContainer = styled(MaxSpaceNoOverflow)({
  display: 'flex',
  flexDirection: 'column',
})

export const Header = styled(AppBar)({
  height: 64,
})

export const ContentContainer = styled(
  MaxSpaceNoOverflow,
  withoutTransientProps,
)<{ $withPadding: boolean; $withScrolling: boolean }>(({ theme, $withPadding, $withScrolling }) => ({
  height: 'calc(100% - 64px)',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  ...($withPadding && {
    padding: `${theme.spacing(2)} calc(${theme.spacing(2)} + min(${theme.spacing(4)}, max(0px, calc(100vw - 30rem)) / 10))`,
  }),
  ...($withScrolling && { overflow: 'auto' }),
}))

type CustomAction = {
  Icon: IconType
  onClick(): void
}

const ActionButtom = (props: CustomAction) => (
  <IconButton onClick={() => props.onClick()}>
    <props.Icon />
  </IconButton>
)

export interface ContentWithHeaderProps {
  children: ReactNode | ReactNode[]
  title: string
  action?: 'menu' | 'return' | CustomAction
  rightContent?: ReactNode
  setContentRef?: (value: ((prevState: HTMLDivElement | null) => HTMLDivElement | null) | HTMLDivElement | null) => void
  withPadding?: boolean
  withScrolling?: boolean
}

const ContentWithHeader: FC<ContentWithHeaderProps> = (props) => {
  const {
    title,
    children,
    action,
    rightContent,
    setContentRef = undefined,
    withPadding = false,
    withScrolling = false,
  } = props
  const { IconLib } = useContext(IconToolsContext)
  const { open } = useContext(DrawerContext)
  const navigate = useNavigate()

  let actionButton = null
  if (action === 'return') {
    actionButton = <ActionButtom Icon={IconLib.MdKeyboardBackspace} onClick={() => navigate(-1)} />
  } else if (action === 'menu') {
    if (typeof open !== 'undefined') {
      actionButton = <ActionButtom Icon={IconLib.MdMenu} onClick={open} />
    }
  } else if (typeof action !== 'undefined') {
    actionButton = <ActionButtom {...action} />
  }

  return (
    <ContentWithHeaderContainer>
      <Header position="static">
        <Toolbar>
          {actionButton}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          {typeof rightContent !== 'undefined' && rightContent}
        </Toolbar>
      </Header>

      <ContentContainer ref={setContentRef} $withPadding={withPadding} $withScrolling={withScrolling}>
        {children}
      </ContentContainer>
    </ContentWithHeaderContainer>
  )
}

export default ContentWithHeader
