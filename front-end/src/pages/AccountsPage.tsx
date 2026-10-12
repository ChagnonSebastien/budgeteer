import { Box, IconButton, Stack } from '@mui/material'
import { FC, useContext, useRef, useState } from 'react'

import AccountCard from '../components/accounts/AccountCard'
import DeleteAccountDialog from '../components/accounts/DeleteAccountDialog'
import GroupedAccountList, { isAccountUnused } from '../components/accounts/GroupedAccountList'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ActionSpeedDial from '../components/shared/ActionSpeedDial'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import HideUnusedMenu from '../components/shared/HideUnusedMenu'
import { useNavigateFromDialog } from '../components/shared/useCloseOnBack'
import useQueryParams from '../components/shared/useQueryParams'
import Account from '../domain/model/account'
import { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const navigate = useNavigateFromDialog()
  const { IconLib } = useContext(IconToolsContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { accountBalances } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { queryParams, updateQueryParams } = useQueryParams<{ showZero: string; groupBy: string }>()
  const allUnused = accounts.every((account) => isAccountUnused(account, accountBalances.get(account.id)))
  const showZeroBalances = allUnused || queryParams.showZero === 'true'
  const groupBy = (queryParams.groupBy || 'institution') as 'institution' | 'type'

  const [clickedAccount, setClickedAccount] = useState<Account | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [filter, setFilter] = useState('')

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
      search={{ value: filter, onChange: setFilter, placeholder: 'Search accounts...' }}
      rightContent={
        <>
          {groupBy === 'institution' ? (
            <IconButton aria-label="Group by account type" onClick={() => updateQueryParams({ groupBy: 'type' })}>
              <IconLib.TbCategory size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Group by financial institution"
              onClick={() => updateQueryParams({ groupBy: 'institution' })}
            >
              <IconLib.TbBuildingBank size="1.5rem" />
            </IconButton>
          )}
          {!allUnused && (
            <HideUnusedMenu
              hidden={!showZeroBalances}
              onToggle={() => updateQueryParams({ showZero: (!showZeroBalances).toString() })}
              label="Hide old unused accounts"
            />
          )}
        </>
      }
    >
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', maxWidth: (t) => t.contentWidth.wide }}>
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
          searchQuery={filter}
        />
      </Box>

      <ActionSpeedDial
        ariaLabel="Create account"
        actions={[
          {
            label: 'New account',
            Icon: IconLib.FaPlus,
            color: 'primary.main',
            onClick: () => navigate('/accounts/new'),
          },
        ]}
      />

      <FancyDialog open={clickedAccount !== null} onClose={handleClose}>
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
                intent: 'edit',
                description: 'Modify account details',
                action: () => navigate(`/accounts/edit/${clickedAccount.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Account',
                intent: 'destructive',
                description: 'Move or drop its transactions, then remove it',
                action: () => setAccountToDelete(clickedAccount),
                disabled: false,
              },
              {
                Icon: IconLib.MdList,
                label: 'View Transactions',
                intent: 'navigate',
                description: 'See all account activity',
                action: () => navigate(`/transactions?accounts=[${clickedAccount.id}]`),
                disabled: false,
                availableOffline: true,
              },
            ]}
          >
            {balanceEntries.length > 0 && (
              <>
                <DetailHeading>BALANCES</DetailHeading>
                <Stack spacing={1.5}>
                  {balanceEntries.map(({ currency, amount }, index) => (
                    <DetailCard
                      key={`currency-card-${currency.id}`}
                      delay={index}
                      title={currency.symbol}
                      subTitle={currency.name}
                      value={formatAmount(currency, amount, privacyMode)}
                    />
                  ))}
                </Stack>
              </>
            )}
          </FancyModal>
        )}
      </FancyDialog>
      {accountToDelete && (
        <DeleteAccountDialog
          account={accountToDelete}
          onClose={() => setAccountToDelete(null)}
          onDeleted={() => {
            setAccountToDelete(null)
            setClickedAccount(null)
          }}
        />
      )}
    </ContentWithHeader>
  )
}

export default AccountsPage
