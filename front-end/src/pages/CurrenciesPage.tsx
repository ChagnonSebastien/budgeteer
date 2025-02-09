import { Box, Button, Checkbox, IconButton, Menu, MenuItem, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import { CurrencyList } from '../components/CurrencyList'
import { IconToolsContext } from '../components/IconTools'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CurrenciesPage: FC = () => {
  const navigate = useNavigate()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { IconLib } = useContext(IconToolsContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const showZeroBalances = searchParams.get('showZero') === 'true'
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  return (
    <ContentWithHeader
      title="Currencies"
      button="menu"
      rightButton={
        <>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <IconLib.BiSearch size="1.5rem" />
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
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => navigate('/currencies/new')}
            startIcon={<IconLib.FaPlus />}
            sx={{
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            Add Currency
          </Button>
        </Box>
        {currencies.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
            }}
          >
            <Typography color="text.secondary">No currencies added yet</Typography>
          </Box>
        ) : (
          <CurrencyList
            currencies={currencies}
            onSelect={(currencyId) => navigate(`/currencies/edit/${currencyId}`)}
            showZeroBalances={showZeroBalances}
          />
        )}
      </Box>
    </ContentWithHeader>
  )
}

export default CurrenciesPage
