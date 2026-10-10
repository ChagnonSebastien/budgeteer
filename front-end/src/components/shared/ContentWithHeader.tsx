import { AppBar, IconButton, InputBase, Toolbar, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, ReactNode, useContext, useState } from 'react'
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

export interface HeaderSearch {
  value: string
  onChange(value: string): void
  placeholder: string
}

const SearchField: FC<HeaderSearch & { onClose(): void }> = ({ value, onChange, placeholder, onClose }) => {
  const { IconLib } = useContext(IconToolsContext)
  return (
    <>
      <InputBase
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        onKeyDown={(ev) => ev.key === 'Escape' && onClose()}
        sx={{ flexGrow: 1, mx: 1, px: 1.5, py: 0.5, bgcolor: 'surface.raised', borderRadius: (t) => t.radius.md }}
      />
      <IconButton aria-label="close search" onClick={onClose}>
        <IconLib.IoCloseCircle />
      </IconButton>
    </>
  )
}

export interface ContentWithHeaderProps {
  children: ReactNode | ReactNode[]
  title: string
  action?: 'menu' | 'return' | CustomAction
  rightContent?: ReactNode
  search?: HeaderSearch
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
    search,
    setContentRef = undefined,
    withPadding = false,
    withScrolling = false,
  } = props
  const { IconLib } = useContext(IconToolsContext)
  const { open } = useContext(DrawerContext)
  const navigate = useNavigate()
  const [searching, setSearching] = useState(false)
  const searchOpen = !!search && (searching || search.value !== '')

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
          {searchOpen ? (
            <SearchField
              {...search}
              onClose={() => {
                search.onChange('')
                setSearching(false)
              }}
            />
          ) : (
            <>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {title}
              </Typography>
              {search && <ActionButtom Icon={IconLib.BiSearch} onClick={() => setSearching(true)} />}
            </>
          )}
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
