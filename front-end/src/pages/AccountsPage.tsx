import {
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
import { FC, useContext, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import AccountCard from '../components/accounts/AccountCard'
import GroupedAccountList from '../components/accounts/GroupedAccountList'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import ScrollingOverButton from '../components/shared/ScrollingOverButton'
import Account from '../domain/model/account'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import '../styles/overview-modal-tailwind.css'

const AccountsPage: FC = () => {
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { accountBalances } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const groupBy = (searchParams.get('groupBy') || 'institution') as 'institution' | 'type'
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const [clickedAccount, setClickedAccount] = useState<Account | null>(null)

  const scrollingContainerRef = useRef<HTMLDivElement>(null)

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
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/accounts/new') }}
        scrollingContainerRef={scrollingContainerRef}
      >
        <GroupedAccountList
          ItemComponent={AccountCard}
          items={accounts}
          selectConfiguration={{
            mode: 'click',
            onClick: (account) => setClickedAccount(account),
          }}
          additionalItemsProps={{ showBalances: true }}
          showZeroBalances={showZeroBalances}
          showGroupTotals={true}
          groupBy={groupBy}
          scrollingContainerRef={scrollingContainerRef}
          filterable
        />
      </ScrollingOverButton>

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
          <DialogContent sx={{ padding: 0 }} className="overview-modal-content">
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
                  <IconLib.MdAccountBalance className="opacity-50" />
                  {clickedAccount.financialInstitution}
                </Typography>
              )}
            </div>

            {balanceEntries.length > 0 && (
              <div className="overview-content">
                <Typography variant="subtitle2" className="overview-content-label">
                  BALANCES
                </Typography>
                <div className="overview-items-container">
                  {balanceEntries.map(({ currency, amount }) => (
                    <div key={`currency-card-${currency.id}`} className="overview-item">
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

            <Divider className="opacity-10 my-2" />

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
                    key={`action-${item.label}`}
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
