import { Button, Checkbox, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import '../styles/list-pages.css'
import { CurrencyList } from '../components/CurrencyList'
import { IconToolsContext } from '../components/IconTools'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { IconLib } = useContext(IconToolsContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const [filter, setFilter] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
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
      <div className="list-container" ref={setContentRef}>
        <div className="list-content">
          <div
            className="list-scroll-area"
            style={{
              height: `${contentHeight - optionsHeight}px`,
            }}
          >
            {currencies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <Typography color="text.secondary">No currencies added yet</Typography>
              </div>
            ) : (
              <CurrencyList
                currencies={currencies}
                onSelect={(currencyId) => navigate(`/currencies/edit/${currencyId}`)}
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
            <div className="list-divider" style={{ opacity: scrollProgress }} />
            <Button fullWidth variant="contained" onClick={() => navigate('/currencies/new')}>
              New
            </Button>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default CurrenciesPage
