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
import { FC, Suspense, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrenciesBalanceChart, { GroupType } from '../components/graphing/CurrenciesBalanceChart'
import {
  ControlsContainer,
  GraphContainer,
  GraphPageContainer,
  GraphSelectField,
  SplitViewContainer,
} from '../components/graphing/GraphStyledComponents'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import SplitView from '../components/SplitView'
import Account from '../domain/model/account'

const CurrenciesBalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
    showSlider,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const navigate = useNavigate()

  const groupBy: GroupType = (query.get('groupBy') ?? 'currency') as GroupType
  const baselineConfig: 'none' | 'showIndividualBaselines' | 'showGlobalBaseline' = (query.get('baselineConfig') ??
    'none') as 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
  const scale: 'absolute' | 'cropped-absolute' | 'relative' = (query.get('scale') ?? 'absolute') as
    | 'absolute'
    | 'cropped-absolute'
    | 'relative'

  const [optionsHeight, setOptionsHeight] = useState(140)

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
        <GraphContainer
          height={
            splitHorizontal ? (showSlider ? contentHeight - 200 : contentHeight - 100) : contentHeight - optionsHeight
          }
          style={{ padding: '1rem 0 1rem 0' }}
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
            <CurrenciesBalanceChart
              fromDate={fromDate}
              toDate={toDate}
              filterByAccounts={accountFilter === null ? undefined : accountFilter}
              groupBy={groupBy}
              baselineConfig={baselineConfig}
              scale={scale}
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
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                  <FormControlLabel value="currency" control={<Radio />} label="Currency" />
                  <FormControlLabel value="type" control={<Radio />} label="Type" />
                  <FormControlLabel value="risk" control={<Radio />} label="Risk" />
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel id="interests-view-label" sx={{ color: 'text.secondary', mb: 1 }}>
                  Baseline
                </FormLabel>
                <RadioGroup
                  aria-labelledby="interests-view-label"
                  value={baselineConfig}
                  onChange={(event) => {
                    query.set('baselineConfig', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                >
                  <FormControlLabel value="none" control={<Radio />} label="None" />
                  <FormControlLabel value="showIndividualBaselines" control={<Radio />} label="Individual Book Value" />
                  <FormControlLabel value="showGlobalBaseline" control={<Radio />} label="Global Book Value" />
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
                  <FormControlLabel value="cropped-absolute" control={<Radio />} label="Cropped Absolute" />
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
                <GraphSelectField>
                  <TextField
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
                    <MenuItem value="currency">Currency</MenuItem>
                    <MenuItem value="type">Type</MenuItem>
                    <MenuItem value="risk">Risk</MenuItem>
                  </TextField>
                </GraphSelectField>
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
                  value={baselineConfig}
                  onChange={(event) => {
                    query.set('baselineConfig', event.target.value)
                    navigate(`${location.pathname}?${query.toString()}`)
                  }}
                  variant="standard"
                  fullWidth
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="showIndividualBaselines">Individual Book Value</MenuItem>
                  <MenuItem value="showGlobalBaseline">Global Book Value</MenuItem>
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
                  <MenuItem value="cropped-absolute">Cropped Absolute</MenuItem>
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

export default CurrenciesBalancePage
