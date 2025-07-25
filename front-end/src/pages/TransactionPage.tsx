import {
  Box,
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
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { format, isAfter, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import AggregatedDiffChart from '../components/graphing/AggregatedDiffChart'
import TransactionsPieChart from '../components/graphing/PieChart'
import { IconToolsContext } from '../components/icons/IconTools'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import { DrawerContext } from '../components/Menu'
import ContentDialog from '../components/shared/ContentDialog'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import SplitView from '../components/shared/SplitView'
import { TransactionList } from '../components/transactions/TransactionList'
import { AugmentedCategory } from '../domain/model/category'
import { formatAmount } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext } from '../service/ServiceContext'

import '../styles/overview-modal-tailwind.css'

const GraphSectionContainer = styled.div`
  max-width: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: auto;
  padding-bottom: 1rem;
  height: 100%;
`

const GraphContainer = styled.div`
  height: 60vh;
  position: relative;
  width: 100%;
`

const ListContainer = styled.div`
  padding: 0 1rem;
  width: calc(min(35rem, 100vw));
  margin: auto;
  height: 100%;
  overflow-y: auto;
`

const SplitViewContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const TransactionPage: FC = () => {
  const navigate = useNavigate()
  const { privacyMode } = useContext(DrawerContext)
  const [clickedTransaction, setClickedTransaction] = useState<AugmentedTransaction | null>(null)

  const { augmentedTransactions, rootCategory } = useContext(MixedAugmentation)
  const { state: categories } = useContext(CategoryServiceContext)

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
    <GraphSectionContainer>
      <GraphContainer>
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
      </GraphContainer>

      <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>
    </GraphSectionContainer>
  )

  const listSection = (
    <div className="w-full bg-white/[0.02] h-full overflow-hidden">
      <ListContainer>
        <TransactionList
          transactions={filteredTransaction}
          onClick={(transactionId) => {
            const transaction = filteredTransaction.find((t) => t.id === transactionId)
            if (transaction) {
              setClickedTransaction(transaction)
            }
          }}
          viewAsAccounts={accountFilter === null ? undefined : accountFilter}
        />
      </ListContainer>
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
          first={<SplitViewContainer>{graphSection}</SplitViewContainer>}
          second={listSection}
          split="horizontal"
          firstZoneStyling={{ grow: true, scroll: true }}
          secondZoneStyling={{ grow: false, scroll: true }}
        />
      ) : (
        <div className="h-full flex flex-col overflow-y-auto">
          {graphSection}
          <div className="flex-shrink-0">{listSection}</div>
        </div>
      )}

      <ContentDialog
        open={clickedTransaction !== null}
        onClose={() => setClickedTransaction(null)}
        slotProps={{
          paper: {
            className: 'overview-modal',
          },
        }}
      >
        {clickedTransaction !== null && (
          <DialogContent sx={{ padding: 0 }} className="overview-modal-content">
            <div className="overview-header">
              <div className="overview-header-glow-1" />
              <div className="overview-header-glow-2" />
              <Typography variant="overline" className="overview-header-label">
                {clickedTransaction.sender?.isMine && clickedTransaction.receiver?.isMine
                  ? 'Transfer'
                  : clickedTransaction.sender?.isMine
                    ? 'Expense'
                    : 'Income'}
              </Typography>
              <Typography variant="h5" className="overview-header-title">
                {clickedTransaction.note || 'No description'}
              </Typography>
              <Typography variant="body2" className="overview-header-subtitle">
                <IconLib.MdCalendarToday className="opacity-50" />
                {format(clickedTransaction.date, 'PPP')}
              </Typography>
            </div>

            <div className="overview-content">
              <Typography variant="subtitle2" className="overview-content-label opacity-60">
                DETAILS
              </Typography>
              <div className="overview-items-container">
                <div className="overview-item">
                  <div className="overview-item-info">
                    <div>
                      <Typography variant="body2" className="overview-item-title">
                        {clickedTransaction.currency.symbol}
                      </Typography>
                      <Typography variant="caption" className="overview-item-subtitle">
                        {clickedTransaction.senderId &&
                        clickedTransaction.receiverId &&
                        clickedTransaction.currency.id !== clickedTransaction.receiverCurrency.id
                          ? `Converted to ${clickedTransaction.receiverCurrency.name}`
                          : clickedTransaction.currency.name}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Typography variant="body1" className="overview-item-value">
                      {formatAmount(clickedTransaction.currency, clickedTransaction.amount, privacyMode)}
                    </Typography>
                    {clickedTransaction.senderId &&
                      clickedTransaction.receiverId &&
                      clickedTransaction.currency.id !== clickedTransaction.receiverCurrency.id && (
                        <>
                          <IconLib.MdArrowForwardIos className="opacity-50 w-3.5" />
                          <Typography variant="body1" className="overview-item-value">
                            {formatAmount(
                              clickedTransaction.receiverCurrency,
                              clickedTransaction.receiverAmount,
                              privacyMode,
                            )}
                          </Typography>
                        </>
                      )}
                  </div>
                </div>
                {/* Category */}
                {clickedTransaction.category && (
                  <div className="overview-item">
                    <div className="overview-item-info">
                      <Typography variant="body2" className="overview-item-title">
                        Category
                      </Typography>
                    </div>
                    <Typography variant="body1" className="overview-item-value">
                      {clickedTransaction.category.name}
                    </Typography>
                  </div>
                )}

                {/* Sender Account */}
                {clickedTransaction.sender && (
                  <div className="overview-item">
                    <div className="overview-item-info">
                      <Typography variant="body2" className="overview-item-title">
                        From
                      </Typography>
                    </div>
                    <Typography variant="body1" className="overview-item-value">
                      {clickedTransaction.sender.name}
                    </Typography>
                  </div>
                )}

                {/* Receiver Account */}
                {clickedTransaction.receiver && (
                  <div className="overview-item">
                    <div className="overview-item-info">
                      <Typography variant="body2" className="overview-item-title">
                        To
                      </Typography>
                    </div>
                    <Typography variant="body1" className="overview-item-value">
                      {clickedTransaction.receiver.name}
                    </Typography>
                  </div>
                )}
              </div>
            </div>

            <Divider className="opacity-10 my-2" />

            <List className="overview-action-list">
              {[
                {
                  icon: <IconLib.MdEdit />,
                  label: 'Edit Transaction',
                  color: '#64B5F6',
                  description: 'Modify transaction details',
                  action: (transaction: AugmentedTransaction) => {
                    navigate(`/transactions/edit/${transaction.id}`)
                    setClickedTransaction(null)
                  },
                  disabled: false,
                },
                {
                  icon: <IconLib.MdDelete />,
                  label: 'Delete Transaction',
                  color: '#EF5350',
                  description: 'Remove this transaction',
                  action: (_transaction: AugmentedTransaction) => {},
                  disabled: true,
                },
              ]
                .filter((item) => !item.disabled)
                .map((item) => (
                  <ListItem
                    key={item.label}
                    component="div"
                    onClick={() => item.action(clickedTransaction)}
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

export default TransactionPage
