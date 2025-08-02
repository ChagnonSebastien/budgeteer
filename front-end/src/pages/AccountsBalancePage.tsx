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
import { FC, Suspense, useMemo } from 'react'

import AccountsBalanceChart, { GroupType } from '../components/graphing/AccountsBalanceChart'
import {
  ControlsContainer,
  GraphContainer,
  GraphPageContainer,
  GraphSelectField,
  SplitViewContainer,
} from '../components/graphing/GraphStyledComponents'
import { BaseLineConfig, ScaleConfig } from '../components/graphing/NetWorthChart'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column, Row } from '../components/shared/NoteContainer'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import Account from '../domain/model/account'

type QueryParams = {
  groupBy: string
  baselineConfig: string
  scale: string
}

const AccountsBalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
    showSlider,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const groupBy = useMemo(() => (qp.groupBy ?? 'account') as GroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const scale = useMemo(() => (qp.scale ?? 'absolute') as ScaleConfig, [qp.scale])

  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const { ref: setContentRef, height: contentHeight, width: contentWidth } = useElementDimensions(600, 600)

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graph = useMemo(
    () => (
      <AccountsBalanceChart
        fromDate={fromDate}
        toDate={toDate}
        filterByAccounts={accountFilter === null ? undefined : accountFilter}
        groupBy={groupBy}
        baselineConfig={baselineConfig}
        scale={scale}
      />
    ),
    [fromDate, toDate, accountFilter, groupBy, baselineConfig, scale],
  )

  const graphSection = useMemo(
    () => (
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
                <Row
                  style={{
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    Loading chart data...
                  </Typography>
                </Row>
              }
            >
              {graph}
            </Suspense>
          </GraphContainer>

          {splitHorizontal && <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>}
        </div>
      </SplitViewContainer>
    ),
    [graph, splitHorizontal, showSlider, contentHeight, optionsHeight, filterOverview],
  )

  const controlsSection = (
    <div className={`w-full h-full ${splitHorizontal ? 'bg-white/[0.02] overflow-auto' : ''}`}>
      <ControlsContainer
        $splitView={splitHorizontal}
        className={!splitHorizontal ? 'bg-white/[0.02]' : ''}
        ref={setOptionsRef}
      >
        <Column style={{ gap: '1.5rem' }}>
          {!splitHorizontal && <Box sx={{ mb: 2 }}>{filterOverview}</Box>}

          {splitHorizontal ? (
            <Column style={{ gap: 4, marginTop: 2 }}>
              <FormControl>
                <FormLabel id="group-by-label" sx={{ color: 'text.secondary', mb: 1 }}>
                  Group by
                </FormLabel>
                <RadioGroup
                  aria-labelledby="group-by-label"
                  value={groupBy}
                  onChange={(event) => {
                    updateQueryParams({ groupBy: event.target.value })
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
                  Baseline
                </FormLabel>
                <RadioGroup
                  aria-labelledby="interests-view-label"
                  value={baselineConfig}
                  onChange={(event) => {
                    updateQueryParams({ baselineConfig: event.target.value })
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
                    updateQueryParams({ scale: event.target.value })
                  }}
                >
                  <FormControlLabel value="absolute" control={<Radio />} label="Absolute" />
                  <FormControlLabel value="cropped-absolute" control={<Radio />} label="Cropped Absolute" />
                  <FormControlLabel value="relative" control={<Radio />} label="Relative (%)" />
                </RadioGroup>
              </FormControl>
            </Column>
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
                      updateQueryParams({ groupBy: event.target.value })
                    }}
                    variant="standard"
                    fullWidth
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="account">Account</MenuItem>
                    <MenuItem value="financialInstitution">Financial Institution</MenuItem>
                    <MenuItem value="type">Type</MenuItem>
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
                    updateQueryParams({ baselineConfig: event.target.value })
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
                    updateQueryParams({ scale: event.target.value })
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
        </Column>
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
          <div>
            {graphSection}
            {controlsSection}
          </div>
        )}
      </GraphPageContainer>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
