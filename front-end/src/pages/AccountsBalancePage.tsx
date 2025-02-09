import { alpha, Box, MenuItem, TextField, Typography } from '@mui/material'
import '../styles/graphs.css'
import { FC, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import AccountsBalanceChart, { GroupType } from '../components/AccountsBalanceChart'
import ContentWithHeader from '../components/ContentWithHeader'
import useTransactionFilter from '../components/useTransactionFilter'
import Account from '../domain/model/account'

const AccountsBalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const navigate = useNavigate()

  const groupBy: GroupType = (query.get('groupBy') ?? 'account') as GroupType
  const splitInvestments: 'both' | 'split' | 'bookValue' | 'interests' = (query.get('splitInvestments') ?? 'both') as
    | 'both'
    | 'split'
    | 'bookValue'
    | 'interests'
  const scale: 'absolute' | 'relative' = (query.get('scale') ?? 'absolute') as 'absolute' | 'relative'

  const [optionsHeight, setOptionsHeight] = useState(140)

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
      title="Balances"
      button="menu"
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      contentPadding="1rem 0 0 0"
    >
      <div className="graph-page" ref={setContentRef}>
        <div
          className="graph-container"
          style={{
            height: `${contentHeight - optionsHeight}px`,
          }}
        >
          <Suspense
            fallback={
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Loading chart data...
                </Typography>
              </Box>
            }
          >
            <AccountsBalanceChart
              fromDate={fromDate}
              toDate={toDate}
              filterByAccounts={accountFilter === null ? undefined : accountFilter}
              groupBy={groupBy}
              splitInvestements={splitInvestments}
              spread={scale === 'relative'}
            />
          </Suspense>
        </div>

        <div
          className="graph-controls"
          ref={(element: HTMLDivElement | null) => {
            if (element) setOptionsHeight(element.scrollHeight)
          }}
        >
          <div className="graph-controls-group">
            <Box sx={{ mb: 2 }}>{filterOverview}</Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 2,
                width: '100%',
              }}
            >
              <Box>
                <TextField
                  className="graph-select-field"
                  label="Group by"
                  sx={{
                    '& .MuiInput-underline:before': {
                      borderBottomColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                  select
                  value={groupBy}
                  onChange={(event) => {
                    query.set('groupBy', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                  variant="standard"
                  fullWidth
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="account">Account</MenuItem>
                  <MenuItem value="financialInstitution">Financial Institution</MenuItem>
                  <MenuItem value="type">Type</MenuItem>
                </TextField>
              </Box>
              <Box>
                <TextField
                  className="select-field"
                  label="Interests View"
                  sx={{
                    width: '100%',
                    '& .MuiInput-underline:before': {
                      borderBottomColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                  select
                  value={splitInvestments}
                  onChange={(event) => {
                    query.set('splitInvestments', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                  variant="standard"
                  fullWidth
                >
                  <MenuItem value="both">Merge</MenuItem>
                  <MenuItem value="split">Split Interests</MenuItem>
                  <MenuItem value="bookValue">Only Book Value</MenuItem>
                  <MenuItem value="interests">Only Interests</MenuItem>
                </TextField>
              </Box>
              <Box>
                <TextField
                  className="select-field"
                  label="Scale"
                  sx={{
                    '& .MuiInput-underline:before': {
                      borderBottomColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                  select
                  value={scale}
                  onChange={(event) => {
                    query.set('scale', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                  variant="standard"
                  fullWidth
                >
                  <MenuItem value="absolute">Absolute</MenuItem>
                  <MenuItem value="relative">Relative (%)</MenuItem>
                </TextField>
              </Box>
            </Box>
          </div>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
