import {
  Button,
  Checkbox,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import '../styles/overview-modal.css'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { AccountList } from '../components/AccountList'
import ContentDialog from '../components/ContentDialog'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import { DrawerContext } from '../components/Menu'
import Account from '../domain/model/account'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)
  const { accountBalances } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
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

  const [clickedAccount, setClickedAccount] = useState<Account | null>(null)

  const handleClose = () => {
    setClickedAccount(null)
  }

  const balanceEntries = [...(accountBalances.get(clickedAccount?.id ?? -1)?.entries() ?? [])]
    .filter((entry) => entry[1] !== 0)
    .map((entry) => {
      const currency = currencies.find((c) => c.id === entry[0])
      if (typeof currency === 'undefined') return null
      return { currency, amount: entry[1] }
    })
    .filter((entry) => entry !== null)

  return (
    <ContentWithHeader
      title="Accounts"
      button="menu"
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      rightButton={
        <>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <IconLib.MdSettings size="1.5rem" />
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
              onSelect={(account) => setClickedAccount(account)}
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

      <ContentDialog
        open={clickedAccount !== null}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'overview-modal',
          },
        }}
      >
        {clickedAccount !== null && (
          <DialogContent sx={{ padding: 0 }} className="overview-modal">
            <div className="overview-header">
              <div className="overview-header-glow-1" />
              <div className="overview-header-glow-2" />
              <Typography variant="overline" className="overview-header-label">
                {clickedAccount.type || 'Account'}
              </Typography>
              <Typography variant="h5" className="overview-header-title">
                {clickedAccount.name}
              </Typography>
              {clickedAccount.financialInstitution && (
                <Typography variant="body2" className="overview-header-subtitle">
                  <IconLib.MdAccountBalance style={{ opacity: 0.5 }} />
                  {clickedAccount.financialInstitution}
                </Typography>
              )}
            </div>

            {defaultCurrency && balanceEntries.length > 0 && (
              <div className="overview-content">
                <Typography variant="subtitle2" className="overview-content-label">
                  BALANCES
                </Typography>
                <div className="overview-items-container">
                  {balanceEntries.map(({ currency, amount }) => (
                    <div key={currency.id} className="overview-item">
                      <div className="overview-item-info">
                        <div>
                          <Typography variant="body2" className="overview-item-title">
                            {currency.symbol}
                          </Typography>
                          <Typography variant="caption" className="overview-item-subtitle">
                            {currency.name}
                          </Typography>
                        </div>
                      </div>
                      <Typography variant="body1" className="overview-item-value">
                        {formatAmount(currency, amount, privacyMode)}
                      </Typography>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Divider
              sx={{
                opacity: 0.1,
                margin: '8px 0',
              }}
            />

            <List className="overview-action-list">
              {[
                {
                  icon: <IconLib.MdEdit />,
                  label: 'Edit Account',
                  color: '#64B5F6',
                  description: 'Modify account details',
                  action: (account: Account) => navigate(`/accounts/edit/${account.id}`),
                  disabled: false,
                },
                {
                  icon: <IconLib.MdDelete />,
                  label: 'Delete Account',
                  color: '#EF5350',
                  description: 'Remove this account',
                  action: (_account: Account) => {},
                  disabled: true,
                },
                {
                  icon: <IconLib.MdList />,
                  label: 'View Transactions',
                  color: '#81C784',
                  description: 'See all account activity',
                  action: (account: Account) => navigate(`/transactions?accounts=[${account.id}]`),
                  disabled: false,
                },
              ]
                .filter((item) => !item.disabled)
                .map((item) => (
                  <ListItem
                    key={item.label}
                    component="div"
                    onClick={() => item.action(clickedAccount)}
                    className="overview-action-item"
                  >
                    <ListItemIcon className="overview-action-icon" sx={{ color: item.color }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      slotProps={{
                        primary: { className: 'overview-action-title' },
                        secondary: { className: 'overview-action-description' },
                      }}
                    />
                  </ListItem>
                ))}
            </List>
          </DialogContent>
        )}
      </ContentDialog>
    </ContentWithHeader>
  )
}

export default AccountsPage
