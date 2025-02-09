import { Button, Checkbox, IconButton, Menu, MenuItem } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AccountList } from '../components/AccountList'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import { AccountServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const groupBy = (searchParams.get('groupBy') || 'institution') as 'institution' | 'type'
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [filter, setFilter] = useState('')
  const [scrollProgress, setScrollProgress] = useState(1)

  const [optionsHeight, setOptionsHeight] = useState(240)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentHeight(ref.clientHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  return (
    <ContentWithHeader
      title="Accounts"
      button="menu"
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      rightButton={
        <>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <IconLib.BiSearch size="1.5rem" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setSearchParams({ ...Object.fromEntries(searchParams), showZero: (!showZeroBalances).toString() })
                setAnchorEl(null)
              }}
              sx={{ gap: 1 }}
            >
              <Checkbox checked={showZeroBalances} size="small" />
              Show unused accounts
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSearchParams({
                  ...Object.fromEntries(searchParams),
                  groupBy: groupBy === 'institution' ? 'type' : 'institution',
                })
                setAnchorEl(null)
              }}
              sx={{ gap: 1 }}
            >
              <Checkbox checked={groupBy === 'type'} size="small" />
              Group by type
            </MenuItem>
          </Menu>
        </>
      }
    >
      <div style={{ height: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center' }} ref={setContentRef}>
        <div style={{ maxWidth: '50rem', flexGrow: 1 }}>
          <div
            style={{
              width: '100%',
              position: 'relative',
              height: `${contentHeight - optionsHeight}px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <AccountList
              accounts={accounts}
              onSelect={(account) => navigate(`/accounts/edit/${account.id}`)}
              showBalances
              showZeroBalances={showZeroBalances}
              showGroupTotals={true}
              groupBy={groupBy}
              filterable={{ filter, setFilter }}
              onScrollProgress={setScrollProgress}
            />
          </div>
          <div
            ref={(ref) => {
              if (ref !== null) setOptionsHeight(ref.scrollHeight)
            }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                height: '1rem',
                borderTop: '1px solid transparent',
                borderImage: 'linear-gradient(to right, transparent, #fff4 20%, #fff4 80%, transparent) 1',
                background: 'radial-gradient(ellipse 100% 100% at 50% 0%, #fff2 0%, #fff0 50%, transparent 100%)',
                opacity: scrollProgress,
              }}
            />
            <Button fullWidth variant="contained" onClick={() => navigate('/accounts/new')}>
              New
            </Button>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsPage
