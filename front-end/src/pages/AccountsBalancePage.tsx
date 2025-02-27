import {
  alpha,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import '../styles/graphs-tailwind.css'
import { FC, Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import AccountsBalanceChart, { GroupType } from '../components/AccountsBalanceChart'
import ContentWithHeader from '../components/ContentWithHeader'
import SplitView from '../components/SplitView'
import useTransactionFilter from '../components/useTransactionFilter'
import Account from '../domain/model/account'

const GraphPageContainer = styled.div`
  height: 100%;
  width: 100%;
`

const GraphContainer = styled.div<{ height: number }>`
  height: ${(props) => `${props.height}px`};
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1rem 0 1rem 0;

  & > div {
    max-width: 100vh;
  }
`

const ControlsContainer = styled.div<{ $splitView?: boolean }>`
  padding: 1rem 2rem;
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(255, 255, 255, 0.1)')};
`

const SplitViewContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`

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

  // Ref for the controls container to measure its height
  const [controlsRef, setControlsRef] = useState<HTMLDivElement | null>(null)

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
  const [contentWidth, setContentWidth] = useState(600)
  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentHeight(ref.clientHeight)
      setContentWidth(ref.clientWidth)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graphSection = (
    <SplitViewContainer>
      <div className="flex flex-col w-full">
        <GraphContainer height={splitHorizontal ? contentHeight - 100 : contentHeight - optionsHeight}>
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
        </GraphContainer>

        {splitHorizontal && <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>}
      </div>
    </SplitViewContainer>
  )

  const controlsSection = (
    <div className={`w-full h-full ${splitHorizontal ? 'bg-white/[0.02] overflow-auto' : ''}`}>
      <ControlsContainer
        $splitView={splitHorizontal}
        className={!splitHorizontal ? 'bg-white/[0.02]' : ''}
        ref={(element: HTMLDivElement | null) => {
          if (element && !splitHorizontal) setOptionsHeight(element.scrollHeight)
          setControlsRef(element)
        }}
      >
        <div className="graph-controls-group">
          {!splitHorizontal && <Box sx={{ mb: 2 }}>{filterOverview}</Box>}

          {splitHorizontal ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 2 }}>
              <FormControl>
                <FormLabel id="group-by-label" sx={{ color: 'text.secondary', mb: 1 }}>
                  Group by
                </FormLabel>
                <RadioGroup
                  aria-labelledby="group-by-label"
                  value={groupBy}
                  onChange={(event) => {
                    query.set('groupBy', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                >
                  <FormControlLabel value="none" control={<Radio />} label="None" />
                  <FormControlLabel value="account" control={<Radio />} label="Account" />
                  <FormControlLabel value="financialInstitution" control={<Radio />} label="Financial Institution" />
                  <FormControlLabel value="type" control={<Radio />} label="Type" />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel id="interests-view-label" sx={{ color: 'text.secondary', mb: 1 }}>
                  Interests View
                </FormLabel>
                <RadioGroup
                  aria-labelledby="interests-view-label"
                  value={splitInvestments}
                  onChange={(event) => {
                    query.set('splitInvestments', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                >
                  <FormControlLabel value="both" control={<Radio />} label="Merge" />
                  <FormControlLabel value="split" control={<Radio />} label="Split Interests" />
                  <FormControlLabel value="bookValue" control={<Radio />} label="Only Book Value" />
                  <FormControlLabel value="interests" control={<Radio />} label="Only Interests" />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel id="scale-label" sx={{ color: 'text.secondary', mb: 1 }}>
                  Scale
                </FormLabel>
                <RadioGroup
                  aria-labelledby="scale-label"
                  value={scale}
                  onChange={(event) => {
                    query.set('scale', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                >
                  <FormControlLabel value="absolute" control={<Radio />} label="Absolute" />
                  <FormControlLabel value="relative" control={<Radio />} label="Relative (%)" />
                </RadioGroup>
              </FormControl>
            </Box>
          ) : (
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
          )}
        </div>
      </ControlsContainer>
    </div>
  )

  return (
    <ContentWithHeader
      title="Balances"
      button="menu"
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      contentPadding="0"
      setContentRef={setContentRef}
    >
      <GraphPageContainer>
        {splitHorizontal ? (
          <SplitView
            first={graphSection}
            second={controlsSection}
            split="horizontal"
            firstZoneStyling={{ grow: true, scroll: true }}
            secondZoneStyling={{ grow: false, scroll: true }}
          />
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            {graphSection}
            {controlsSection}
          </div>
        )}
      </GraphPageContainer>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
