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
import { ResponsiveLine } from '@nivo/line'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentDialog from '../components/ContentDialog'
import ContentWithHeader from '../components/ContentWithHeader'
import '../styles/list-pages.css'
import '../styles/overview-modal.css'
import { CurrencyList } from '../components/CurrencyList'
import { IconToolsContext } from '../components/IconTools'
import Currency, { ExchangeRate } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()
  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)
  const { exchangeRates, exchangeRateOnDay, augmentedTransactions } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const [filter, setFilter] = useState('')
  const [clickedCurrency, setClickedCurrency] = useState<Currency | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const [scrollProgress, setScrollProgress] = useState(1)

  const [optionsHeight, setOptionsHeight] = useState(240)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)

  const { monthlyRates, minRate } = useMemo(() => {
    if (!clickedCurrency || !defaultCurrency) {
      return { monthlyRates: [], minRate: 0 }
    }

    let rates = exchangeRates.get(clickedCurrency.id)?.get(defaultCurrency.id)
    if (clickedCurrency.id === defaultCurrency.id) {
      rates = [new ExchangeRate(1, 1, new Date())]
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
            {currencies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <Typography color="text.secondary">No currencies added yet</Typography>
              </div>
            ) : (
              <CurrencyList
                currencies={currencies}
                onSelect={(currencyId) => setClickedCurrency(currencies.find((c) => c.id === currencyId) ?? null)}
                showZeroBalances={showZeroBalances}
                onScrollProgress={setScrollProgress}
                filterable={{ filter, setFilter }}
              />
            )}
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
                opacity: scrollProgress ?? 1,
              }}
            />
            <Button fullWidth variant="contained" onClick={() => navigate('/currencies/new')}>
              New
            </Button>
          </div>
        </div>
      </div>

      <ContentDialog
        open={clickedCurrency !== null}
        onClose={() => setClickedCurrency(null)}
        slotProps={{
          paper: {
            className: 'overview-modal',
          },
        }}
      >
        {clickedCurrency !== null && defaultCurrency && (
          <DialogContent sx={{ padding: 0 }} className="overview-modal">
            <div className="overview-header">
              <div className="overview-header-glow-1" />
              <div className="overview-header-glow-2" />
              <Typography variant="overline" className="overview-header-label">
                Currency
              </Typography>
              <Typography variant="h5" className="overview-header-title">
                {clickedCurrency.name}
              </Typography>
              <Typography variant="body2" className="overview-header-subtitle">
                <IconLib.BsCurrencyExchange style={{ opacity: 0.5 }} />
                {clickedCurrency.symbol}
              </Typography>
            </div>

            <div className="overview-content">
              <Typography variant="subtitle2" className="overview-content-label">
                EXCHANGE RATE HISTORY
              </Typography>
              <div style={{ height: 200, marginTop: 16 }}>
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
              </div>
            </div>

            <Divider sx={{ opacity: 0.1, margin: '8px 0' }} />

            <List className="overview-action-list">
              {[
                {
                  icon: <IconLib.MdEdit />,
                  label: 'Edit Currency',
                  color: '#64B5F6',
                  description: 'Modify currency details',
                  action: (currency: Currency) => navigate(`/currencies/edit/${currency.id}`),
                  disabled: false,
                },
                {
                  icon: <IconLib.MdDelete />,
                  label: 'Delete Currency',
                  color: '#EF5350',
                  description: 'Remove this currency',
                  action: (_currency: Currency) => {},
                  disabled: true,
                },
              ]
                .filter((item) => !item.disabled)
                .map((item) => (
                  <ListItem
                    key={item.label}
                    component="div"
                    onClick={() => item.action(clickedCurrency)}
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

export default CurrenciesPage
