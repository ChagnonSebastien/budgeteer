import { Box, Checkbox, FormControlLabel, Radio, RadioGroup } from '@mui/material'
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
  const splitInvestments: boolean = Number.parseInt(query.get('splitInvestments') ?? '0') > 0
  const spread: boolean = Number.parseInt(query.get('spread') ?? '0') > 0

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
            filterByAccounts={accountFilter === null ? undefined : [accountFilter]}
            groupBy={groupBy}
            splitInvestements={splitInvestments}
            spread={spread}
          />
        </div>

        <div
          ref={(ref) => {
            if (ref !== null) setOptionsHeight(ref.scrollHeight)
          }}
        >
          {filterOverview}

          <Box sx={{ padding: '.5rem 2rem 1rem 2rem' }}>
            <Box
              sx={{
                backgroundColor: '#8882',
                padding: '1rem',
                borderRadius: '1rem',
                display: 'flex',
                justifyContent: 'space-around',
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold' }}>Group by</div>
                <RadioGroup
                  value={groupBy}
                  onChange={(newValue) => {
                    query.set('groupBy', newValue.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                >
                  <FormControlLabel
                    value="none"
                    label="None"
                    sx={{ margin: 0 }}
                    control={<Radio sx={{ padding: '0' }} />}
                  />
                  <FormControlLabel
                    value="account"
                    label="Account"
                    sx={{ margin: 0 }}
                    control={<Radio sx={{ padding: '0' }} />}
                  />
                  <FormControlLabel
                    value="financialInstitution"
                    label="Financial Institution"
                    sx={{ margin: 0 }}
                    control={<Radio sx={{ padding: '0' }} />}
                  />
                  <FormControlLabel
                    value="type"
                    label="Type"
                    sx={{ margin: 0 }}
                    control={<Radio sx={{ padding: '0' }} />}
                  />
                </RadioGroup>
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>Show</div>
                {groupBy === 'none' && (
                  <Box>
                    <FormControlLabel
                      value="type"
                      label="Interests"
                      sx={{ margin: 0 }}
                      control={
                        <Checkbox
                          sx={{ padding: '0' }}
                          checked={splitInvestments}
                          onChange={(newValue) => {
                            query.set('splitInvestments', newValue.target.checked ? '1' : '0')
                            navigate(`${location.pathname}?${query.toString()}`)
                          }}
                        />
                      }
                    />
                  </Box>
                )}
                <Box>
                  <FormControlLabel
                    value="type"
                    label="Spread"
                    sx={{ margin: 0 }}
                    control={
                      <Checkbox
                        sx={{ padding: '0' }}
                        checked={spread}
                        onChange={(newValue) => {
                          query.set('spread', newValue.target.checked ? '1' : '0')
                          navigate(`${location.pathname}?${query.toString()}`)
                        }}
                      />
                    }
                  />
                </Box>
              </div>
            </Box>
          </Box>
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
