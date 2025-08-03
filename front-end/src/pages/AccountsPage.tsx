import { Checkbox, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { FC, useContext, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import AccountCard from '../components/accounts/AccountCard'
import GroupedAccountList from '../components/accounts/GroupedAccountList'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModalComponents'
import ScrollingOverButton from '../components/shared/ScrollingOverButton'
import Account from '../domain/model/account'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

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
      action="menu"
      withPadding
      rightContent={
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
            style: {
              backgroundColor: 'transparent',
              borderRadius: '24px',
              border: '0',
              overflow: 'hidden',
            },
          },
        }}
      >
        {clickedAccount !== null && (
          <FancyModal
            title={{
              topCategory: clickedAccount.type || 'Account',
              bigTitle: clickedAccount.name,
              bottomSpec: {
                IconComponent: IconLib.MdAccountBalance,
                text: clickedAccount.financialInstitution,
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Account',
                color: '#64B5F6',
                description: 'Modify account details',
                action: () => navigate(`/accounts/edit/${clickedAccount.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Account',
                color: '#EF5350',
                description: 'Remove this account',
                action: () => {},
                disabled: true,
              },
              {
                Icon: IconLib.MdList,
                label: 'View Transactions',
                color: '#81C784',
                description: 'See all account activity',
                action: () => navigate(`/transactions?accounts=[${clickedAccount.id}]`),
                disabled: false,
              },
            ]}
          >
            {balanceEntries.length > 0 && (
              <>
                <Typography
                  variant="subtitle2"
                  style={{
                    opacity: 0.6,
                    marginBottom: '16px',
                    letterSpacing: '0.05em',
                    fontSize: '0.75rem',
                  }}
                >
                  BALANCES
                </Typography>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {balanceEntries.map(({ currency, amount }, index) => (
                    <DetailCard
                      key={`currency-card-${currency.id}`}
                      delay={index}
                      title={currency.symbol}
                      subTitle={currency.name}
                      value={formatAmount(currency, amount, privacyMode)}
                    />
                  ))}
                </div>
              </>
            )}
          </FancyModal>
        )}
      </ContentDialog>
    </ContentWithHeader>
  )
}

export default AccountsPage
