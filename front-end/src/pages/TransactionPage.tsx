import {
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { isAfter, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import AggregatedDiffChart from '../components/AggregatedDiffChart'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import TransactionsPieChart from '../components/PieChart'
import SplitView from '../components/SplitView'
import { TransactionList } from '../components/TransactionList'
import useTransactionFilter from '../components/useTransactionFilter'
import { AugmentedCategory } from '../domain/model/category'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext } from '../service/ServiceContext'

const TransactionPage: FC = () => {
  const navigate = useNavigate()

  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)

  const [searchParams, setSearchParams] = useSearchParams()
  const [graphType, setGraphType] = useState<'line' | 'pie'>((searchParams.get('chart') as 'line' | 'pie') || 'line')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const hideFinancialIncome = searchParams.get('hideFinancialIncome') === 'true'
  const showIncomes = searchParams.get('showIncomes') === 'true'
  const open = Boolean(anchorEl)
  const { fromDate, toDate, accountFilter, categoryFilter, overview: filterOverview } = useTransactionFilter()

  const { IconLib } = useContext(IconToolsContext)

  const filteredTransaction = useMemo(() => {
    return augmentedTransactions
      .filter((transaction) => isAfter(transaction.date, fromDate) || isSameDay(transaction.date, fromDate))
      .filter((transaction) => isBefore(transaction.date, toDate) || isSameDay(transaction.date, toDate))
      .filter((transaction) => {
        if (accountFilter === null) return true
        return (
          (transaction.senderId !== null && accountFilter.includes(transaction.senderId)) ||
          (transaction.receiverId !== null && accountFilter.includes(transaction.receiverId))
        )
      })
      .filter((transaction) => {
        if (categoryFilter === null) return true
        let category: AugmentedCategory | undefined = transaction.category
        while (typeof category !== 'undefined') {
          if (categoryFilter.includes(category.id)) return true
          category = category.parent
        }
        return false
      })
  }, [augmentedTransactions, categoryFilter, accountFilter, toDate, fromDate])

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentWidth, setContentWidth] = useState(600)
  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentWidth(ref.clientWidth)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graphSection = (
    <div
      style={{
        maxWidth: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        margin: 'auto',
        paddingBottom: '1rem',
      }}
    >
      <div style={{ height: `60vh`, position: 'relative' }}>
        {graphType === 'line' ? (
          <AggregatedDiffChart
            transactions={filteredTransaction}
            toDate={toDate}
            fromDate={fromDate}
            hideFinancialIncome={hideFinancialIncome}
          />
        ) : (
          <TransactionsPieChart
            rootCategory={
              categoryFilter && categoryFilter.length === 1
                ? (categories.find((c) => c.id === categoryFilter[0]) ?? rootCategory)
                : rootCategory
            }
            augmentedTransactions={filteredTransaction}
            showIncomes={showIncomes}
            onShowIncomesChange={(show) => {
              setSearchParams({
                ...Object.fromEntries(searchParams),
                showIncomes: show.toString(),
              })
            }}
          />
        )}
      </div>

      <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>
    </div>
  )

  const listSection = (
    <div
      style={{
        width: '100%',
        background: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <div
        style={{
          padding: '0 1rem',
          width: 'calc(min(35rem, 100vw))',
          margin: 'auto',
        }}
      >
        <TransactionList
          transactions={filteredTransaction}
          onClick={(transactionId) => {
            navigate(`/transactions/edit/${transactionId}`)
          }}
          viewAsAccounts={accountFilter === null ? undefined : accountFilter}
        />
      </div>
    </div>
  )

  return (
    <ContentWithHeader
      title="Transactions"
      button="menu"
      rightButton={
        <>
          {graphType === 'line' ? (
            <IconButton
              onClick={() => {
                setGraphType('pie')
                setSearchParams({ ...Object.fromEntries(searchParams), chart: 'pie' })
              }}
            >
              <IconLib.FaChartPie size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => {
                setGraphType('line')
                setSearchParams({ ...Object.fromEntries(searchParams), chart: 'line' })
              }}
            >
              <IconLib.BsGraphUp size="1.5rem" />
            </IconButton>
          )}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <IconLib.MdSettings size="1.5rem" />
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
            {graphType === 'line' && (
              <MenuItem
                onClick={() => {
                  setSearchParams({
                    ...Object.fromEntries(searchParams),
                    hideFinancialIncome: (!hideFinancialIncome).toString(),
                  })
                  setAnchorEl(null)
                }}
                sx={{ gap: 1 }}
              >
                <Checkbox checked={hideFinancialIncome} size="small" />
                Hide Financial Income
              </MenuItem>
            )}
            {graphType === 'pie' && (
              <MenuItem>
                <ToggleButtonGroup
                  value={showIncomes ? 'income' : 'expense'}
                  exclusive
                  onChange={(_event, value) => {
                    if (value) {
                      setSearchParams({
                        ...Object.fromEntries(searchParams),
                        showIncomes: (value === 'income').toString(),
                      })
                    }
                  }}
                  size="small"
                >
                  <ToggleButton value="expense">Expenses</ToggleButton>
                  <ToggleButton value="income">Income</ToggleButton>
                </ToggleButtonGroup>
              </MenuItem>
            )}
          </Menu>
        </>
      }
      contentMaxWidth="100%"
      contentOverflowY="hidden"
      contentPadding="0"
      setContentRef={setContentRef}
    >
      <SpeedDial
        ariaLabel="Create new transaction"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={
          <SpeedDialIcon
            openIcon={<IconLib.FaPlus />}
            sx={{
              '& .MuiSpeedDialIcon-icon, & .MuiSpeedDialIcon-openIcon': {
                transition: 'all 0.2s ease-in-out',
                height: '24px',
                width: '24px',
              },
              '& .MuiSpeedDialIcon-openIcon': {
                transform: 'rotate(45deg)',
              },
            }}
          />
        }
      >
        <SpeedDialAction
          sx={{ backgroundColor: 'green' }}
          onClick={() => navigate('/transactions/new?type=income')}
          icon={<IconLib.MdInput />}
        />
        <SpeedDialAction
          sx={{ backgroundColor: 'red' }}
          onClick={() => navigate('/transactions/new?type=expense')}
          icon={<IconLib.MdOutput />}
        />
        <SpeedDialAction
          sx={{ backgroundColor: 'darkgrey' }}
          onClick={() => navigate('/transactions/new?type=transfer')}
          icon={<IconLib.GrTransaction />}
        />
      </SpeedDial>

      {splitHorizontal ? (
        <SplitView
          first={
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {graphSection}
            </div>
          }
          second={listSection}
          split="horizontal"
          firstZoneStyling={{ grow: true, scroll: true }}
          secondZoneStyling={{ grow: false, scroll: true }}
        />
      ) : (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'scroll' }}>
          {graphSection}
          {listSection}
        </div>
      )}
    </ContentWithHeader>
  )
}

export default TransactionPage
