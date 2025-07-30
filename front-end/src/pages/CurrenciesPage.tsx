import { Checkbox, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { ResponsiveLine } from '@nivo/line'
import { FC, useContext, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ItemList from '../components/accounts/ItemList'
import CurrencyCard from '../components/currencies/CurrencyCard'
import { IconToolsContext } from '../components/icons/IconTools'
import { SearchOverlay } from '../components/inputs/SearchOverlay'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { FancyModal } from '../components/shared/FancyModalComponents'
import { ChartContainer } from '../components/shared/PageStyledComponents'
import ScrollingOverButton, { CustomScrollbarContainer } from '../components/shared/ScrollingOverButton'
import Currency, { CurrencyID } from '../domain/model/currency'
import ExchangeRate, { ExchangeRateIdentifiableFields } from '../domain/model/exchangeRate'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { exchangeRates, exchangeRateOnDay, augmentedTransactions, defaultCurrency } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const [filter, setFilter] = useState('')
  const [clickedCurrency, setClickedCurrency] = useState<Currency | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const scrollingContainerRef = useRef<HTMLDivElement>(null)
  const { accountBalances } = useContext(MixedAugmentation)
  const { state: accounts } = useContext(AccountServiceContext)

  const { monthlyRates, minRate } = useMemo(() => {
    if (!clickedCurrency) {
      return { monthlyRates: [], minRate: 0 }
    }

    let rates = exchangeRates.get(clickedCurrency.id)?.get(defaultCurrency.id)
    if (clickedCurrency.id === defaultCurrency.id) {
      rates = [
        new ExchangeRate(new ExchangeRateIdentifiableFields(defaultCurrency.id, defaultCurrency.id, new Date()), 1),
      ]
    }
    if (typeof rates === 'undefined' || rates.length === 0) return { monthlyRates: [], minRate: 0 }

    let startDate = new Date(Math.min(...rates.map((r) => new Date(r.date).getTime())))
    if (clickedCurrency.id === defaultCurrency.id) {
      startDate = augmentedTransactions[augmentedTransactions.length - 1].date
    }
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const dataPoints = []
    const currentDate = new Date()
    let currentMonth = new Date(startDate)

    while (currentMonth <= currentDate) {
      const monthTime = currentMonth.getTime()
      const closestRate =
        clickedCurrency.id === defaultCurrency.id
          ? 1
          : exchangeRateOnDay(clickedCurrency.id, defaultCurrency.id, currentMonth)

      dataPoints.push({
        x: monthTime,
        y: closestRate,
      })

      currentMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() + 1))
    }

    const minRate = Math.min(...dataPoints.map((d) => d.y))
    return { monthlyRates: dataPoints, minRate }
  }, [clickedCurrency, defaultCurrency])

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

  return (
    <ContentWithHeader
      title="Currencies"
      button="menu"
      rightButton={
        <>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <IconLib.MdSettings size="1.5rem" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
            <MenuItem
              onClick={() => {
                setSearchParams({ showZero: (!showZeroBalances).toString() })
                setAnchorEl(null)
              }}
              sx={{ gap: 1 }}
            >
              <Checkbox checked={showZeroBalances} size="small" />
              Show unused currencies
            </MenuItem>
          </Menu>
        </>
      }
      contentMaxWidth="100%"
      contentOverflowY="hidden"
    >
      <ScrollingOverButton
        button={{ text: 'New', onClick: () => navigate('/currencies/new') }}
        scrollingContainerRef={scrollingContainerRef}
      >
        {currencies.length === 0 ? (
          <div className="text-center py-8">
            <Typography color="text.secondary">No currencies added yet</Typography>
          </div>
        ) : (
          <>
            <CustomScrollbarContainer
              ref={scrollingContainerRef}
              style={{
                overflowY: 'auto',
                flexGrow: 1,
                paddingBottom: '4rem',
                position: 'relative',
              }}
            >
              <ItemList
                items={currencies}
                ItemComponent={CurrencyCard}
                selectConfiguration={{
                  mode: 'click',
                  onClick: (item: Currency) => setClickedCurrency(currencies.find((c) => c.id === item.id) ?? null),
                }}
                additionalItemsProps={{
                  total: getTotalForCurrency,
                }}
                filter={(item: Currency) => showZeroBalances || getTotalForCurrency(item.id) !== 0}
              />
            </CustomScrollbarContainer>

            <SearchOverlay filter={filter} setFilter={setFilter} placeholder="Search currencies..." />
          </>
        )}
      </ScrollingOverButton>

      <ContentDialog
        open={clickedCurrency !== null}
        onClose={() => setClickedCurrency(null)}
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
        {clickedCurrency !== null && (
          <FancyModal
            title={{
              topCategory: 'Currency',
              bigTitle: clickedCurrency.name,
              bottomSpec: {
                IconComponent: IconLib.BsCurrencyExchange,
                text: clickedCurrency.symbol,
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Currency',
                color: '#64B5F6',
                description: 'Modify currency details',
                action: () => navigate(`/currencies/edit/${clickedCurrency.id}`),
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Currency',
                color: '#EF5350',
                description: 'Remove this currency',
                action: () => {},
                disabled: true,
              },
            ]}
          >
            <Typography
              variant="subtitle2"
              style={{
                opacity: 0.6,
                marginBottom: '16px',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
              }}
            >
              EXCHANGE RATE HISTORY
            </Typography>
            <ChartContainer>
              <ResponsiveLine
                margin={{ top: 0, right: 0, bottom: 30, left: 40 }}
                data={[
                  {
                    id: 'Exchange Rate',
                    data: monthlyRates,
                  },
                ]}
                axisBottom={{
                  format: (f) => {
                    const date = new Date(f)
                    if (date.getUTCMonth() === 0) {
                      return date.getUTCFullYear()
                    }
                    return ''
                  },
                }}
                enablePoints={false}
                enableGridX={false}
                enableGridY={true}
                yScale={{
                  type: 'linear',
                  min: minRate * 0.95, // Add 5% padding below the minimum
                  stacked: false,
                  reverse: false,
                }}
                theme={darkTheme}
                colors={['#64B5F6']}
                curve="monotoneX"
                animate={true}
                motionConfig="gentle"
                enableArea={true}
                areaOpacity={0.1}
              />
            </ChartContainer>
          </FancyModal>
        )}
      </ContentDialog>
    </ContentWithHeader>
  )
}

export default CurrenciesPage
