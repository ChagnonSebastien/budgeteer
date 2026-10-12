import { Alert, Box, IconButton, Link } from '@mui/material'
import { FC, Fragment, useContext, useState } from 'react'

import ItemList from '../components/accounts/ItemList'
import CurrencyCard from '../components/currencies/CurrencyCard'
import DeleteCurrencyDialog from '../components/currencies/DeleteCurrencyDialog'
import { useRateFetchFailures } from '../components/currencies/useRateFetchFailures'
import ExchangeRateHistory from '../components/graphing/ExchangeRateHistory'
import { IconToolsContext } from '../components/icons/IconTools'
import { DrawerContext } from '../components/Menu'
import ActionSpeedDial from '../components/shared/ActionSpeedDial'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CustomScrolling } from '../components/shared/CustomScrolling'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import GroupHeader from '../components/shared/GroupHeader'
import HideUnusedMenu from '../components/shared/HideUnusedMenu'
import { Column } from '../components/shared/Layout'
import { useNavigateFromDialog } from '../components/shared/useCloseOnBack'
import useQueryParams from '../components/shared/useQueryParams'
import Currency, { CurrencyID, formatFull } from '../domain/model/currency'
import { isOldAndUnused } from '../domain/model/usage'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { matchesSearch } from '../utils'

const groupOther = 'Other'

const CurrenciesPage: FC = () => {
  const navigate = useNavigateFromDialog()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { defaultCurrency, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { queryParams, updateQueryParams } = useQueryParams<{ showZero: string; groupBy: string }>()
  const groupBy = (queryParams.groupBy || 'type') as 'type' | 'risk'
  const { IconLib } = useContext(IconToolsContext)
  const [filter, setFilter] = useState('')
  const [clickedCurrency, setClickedCurrency] = useState<Currency | null>(null)
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null)
  const { accountBalances } = useContext(MixedAugmentation)
  const { state: accounts } = useContext(AccountServiceContext)
  const failingFetchers = useRateFetchFailures()

  const getTotalForCurrency = (targetCurrencyId: CurrencyID): number => {
    let total = 0
    const myAccountIds = new Set(accounts.filter((account) => account.isMine).map((account) => account.id))

    accountBalances?.forEach((balances, accountId) => {
      if (!myAccountIds.has(accountId)) return
      const amount = balances.get(targetCurrencyId)
      if (amount) {
        total += amount
      }
    })
    return total
  }

  const isCurrencyUnused = (currency: Currency) =>
    currency.id !== defaultCurrency.id && isOldAndUnused(currency.createdAt, [getTotalForCurrency(currency.id)])
  const allUnused = currencies.every(isCurrencyUnused)
  const showZeroBalances = allUnused || queryParams.showZero === 'true'

  const orderedCurrencies = currencies
    .filter((c) => matchesSearch(c.name, filter) || matchesSearch(c.symbol, filter))
    .filter((c) => showZeroBalances || !isCurrencyUnused(c))
    .sort((a, b) => Number(getTotalForCurrency(a.id) === 0) - Number(getTotalForCurrency(b.id) === 0))

  const groups = Object.entries(
    orderedCurrencies.reduce(
      (groups, currency) => {
        const groupKey = (groupBy === 'risk' ? currency.risk : currency.type) || groupOther
        return { ...groups, [groupKey]: [...(groups[groupKey] || []), currency] }
      },
      {} as Record<string, Currency[]>,
    ),
  ).sort(
    ([a], [b]) => Number(a === groupOther) - Number(b === groupOther) || (groupBy === 'risk' ? a.localeCompare(b) : 0),
  )

  const getGroupTotal = (groupCurrencies: Currency[]) => {
    const now = new Date()
    const total = groupCurrencies.reduce((sum, currency) => {
      const amount = getTotalForCurrency(currency.id)
      if (currency.id === defaultCurrency.id) return sum + amount
      return sum + amount * exchangeRateOnDay(currency.id, defaultCurrency.id, now)
    }, 0)
    return Math.round(total)
  }

  return (
    <ContentWithHeader
      title="Assets"
      action="menu"
      withPadding
      search={{ value: filter, onChange: setFilter, placeholder: 'Search assets...' }}
      rightContent={
        <>
          {groupBy === 'type' ? (
            <IconButton aria-label="Group by risk" onClick={() => updateQueryParams({ groupBy: 'risk' })}>
              <IconLib.TbGauge size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton aria-label="Group by asset type" onClick={() => updateQueryParams({ groupBy: 'type' })}>
              <IconLib.TbCategory size="1.5rem" />
            </IconButton>
          )}
          {!allUnused && (
            <HideUnusedMenu
              hidden={!showZeroBalances}
              onToggle={() => updateQueryParams({ showZero: (!showZeroBalances).toString() })}
              label="Hide old unused assets"
            />
          )}
        </>
      }
    >
      <CustomScrolling sx={{ width: '100%', height: '100%', maxWidth: (t) => t.contentWidth.wide, pb: 11 }}>
        {failingFetchers.length > 0 && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            The last nightly rate fetch failed for{' '}
            {failingFetchers.map((currency, i) => (
              <Fragment key={currency.id}>
                {i > 0 && ', '}
                <Link
                  component="button"
                  color="inherit"
                  sx={{ verticalAlign: 'baseline', fontWeight: 600 }}
                  onClick={() => navigate(`/assets/rates/${currency.id}?tab=fetcher`)}
                >
                  {currency.name}
                </Link>
              </Fragment>
            ))}
            . Their rates were not updated.
          </Alert>
        )}

        {groups.map(([group, groupCurrencies]) => (
          <Column key={`currency-group-${group}`} sx={{ mb: { xs: 3, sm: 4 }, gap: { xs: 1, sm: 1.5 } }}>
            {group !== groupOther && (
              <GroupHeader
                title={group}
                total={formatFull(defaultCurrency, getGroupTotal(groupCurrencies), privacyMode)}
              />
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(auto-fill, minmax(160px, 1fr))' },
                gap: { xs: 1, sm: 1.5 },
              }}
            >
              <ItemList
                items={groupCurrencies}
                ItemComponent={CurrencyCard}
                selectConfiguration={{
                  mode: 'click',
                  onClick: (item: Currency) => setClickedCurrency(currencies.find((c) => c.id === item.id) ?? null),
                }}
                additionalItemsProps={{
                  total: getTotalForCurrency,
                  square: true,
                }}
              />
            </Box>
          </Column>
        ))}
      </CustomScrolling>

      <ActionSpeedDial
        ariaLabel="Create asset"
        actions={[
          {
            label: 'New asset',
            Icon: IconLib.FaPlus,
            color: 'primary.main',
            onClick: () => navigate('/assets/new'),
          },
        ]}
      />

      <FancyDialog open={clickedCurrency !== null} onClose={() => setClickedCurrency(null)}>
        {clickedCurrency !== null && (
          <FancyModal
            title={{
              topCategory: 'Asset',
              bigTitle: clickedCurrency.name,
              bottomSpec: {
                IconComponent: IconLib.BsCurrencyExchange,
                text: clickedCurrency.symbol,
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Asset',
                intent: 'edit',
                description: 'Modify asset details',
                action: () => navigate(`/assets/edit/${clickedCurrency.id}`),
                disabled: false,
              },
              ...(clickedCurrency.id === defaultCurrency.id
                ? []
                : [
                    {
                      Icon: IconLib.BsGraphUp,
                      label: 'Exchange Rates',
                      intent: 'adjust' as const,
                      description: 'Edit rate points and automate fetching',
                      action: () => navigate(`/assets/rates/${clickedCurrency.id}`),
                      disabled: false,
                      availableOffline: true,
                    },
                  ]),
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Asset',
                intent: 'destructive',
                description: 'Move or delete its transactions, then remove it',
                action: () => setCurrencyToDelete(clickedCurrency),
                disabled: false,
              },
            ]}
          >
            {clickedCurrency.id === defaultCurrency.id ? (
              <DetailCard title="Default Currency" value="" />
            ) : (
              <>
                <DetailHeading>EXCHANGE RATE HISTORY</DetailHeading>
                <div
                  style={{
                    height: 'max(25vh, 200px)',
                    display: 'flex',
                    justifyContent: 'stretch',
                    justifyItems: 'stretch',
                  }}
                >
                  <ExchangeRateHistory currency={clickedCurrency} against={defaultCurrency} />
                </div>{' '}
              </>
            )}
          </FancyModal>
        )}
      </FancyDialog>
      {currencyToDelete && (
        <DeleteCurrencyDialog
          currency={currencyToDelete}
          onClose={() => setCurrencyToDelete(null)}
          onDeleted={() => {
            setCurrencyToDelete(null)
            setClickedCurrency(null)
          }}
        />
      )}
    </ContentWithHeader>
  )
}

export default CurrenciesPage
