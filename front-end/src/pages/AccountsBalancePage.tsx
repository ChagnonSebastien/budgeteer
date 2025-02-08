import { Box, MenuItem, TextField } from '@mui/material'
import { FC, useEffect, useState } from 'react'
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
      <div style={{ height: '100%', width: '100%' }} ref={setContentRef}>
        <div
          style={{
            height: `${contentHeight - optionsHeight}px`,
            width: '100%',
            position: 'relative',
            padding: '1rem 0',
          }}
        >
          <AccountsBalanceChart
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
            groupBy={groupBy}
            splitInvestements={splitInvestments}
            spread={scale === 'relative'}
          />
        </div>

        <div
          ref={(ref) => {
            if (ref !== null) setOptionsHeight(ref.scrollHeight)
          }}
        >
          {filterOverview}

          <Box
            sx={{
              backgroundColor: '#8882',
              padding: '.5rem',
              borderRadius: '.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '.75rem',
              margin: '1rem 1rem 0 1rem',
            }}
          >
            <div style={{ minWidth: '140px', flex: 1 }}>
              <TextField
                label="Group by"
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
            </div>
            <div style={{ minWidth: '140px', flex: 1 }}>
              <TextField
                label="Interests View"
                select
                value={splitInvestments}
                onChange={(event) => {
                  query.set('splitInvestments', event.target.value)
                  navigate(`${location.pathname}?${query.toString()}`)
                }}
                variant="standard"
                fullWidth
                sx={{ width: '100%' }}
              >
                <MenuItem value="both">Merge</MenuItem>
                <MenuItem value="split">Split Interests</MenuItem>
                <MenuItem value="bookValue">Only Book Value</MenuItem>
                <MenuItem value="interests">Only Interests</MenuItem>
              </TextField>
            </div>
            <div style={{ minWidth: '140px', flex: 1 }}>
              <TextField
                label="Scale"
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
            </div>
          </Box>
          <Box sx={{ height: '.5rem' }} />
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
