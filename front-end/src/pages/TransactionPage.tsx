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
  Typography,
} from '@mui/material'
import { format, isAfter, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { default as styled } from 'styled-components'

import AggregatedDiffChart from '../components/graphing/AggregatedDiffChart'
import TransactionsPieChart from '../components/graphing/PieChart'
import { IconToolsContext } from '../components/icons/IconTools'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import { DrawerContext } from '../components/Menu'
import BasicModal from '../components/shared/BasicModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, FancyModal } from '../components/shared/FancyModal'
import { Column } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import TransactionCard from '../components/transactions/TransactionCard'
import { TransactionList } from '../components/transactions/TransactionList'
import { AugmentedCategory } from '../domain/model/category'
import { formatAmount } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext } from '../service/ServiceContext'

const GraphSectionContainer = styled.div`
  max-width: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: auto;
  padding-bottom: 1rem;
`

const GraphContainer = styled.div`
  height: 60vh;
  position: relative;
  width: 100%;
`

const SplitViewContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`

type QueryParams = {
  chart: string
  hideFinancialIncome: string
  showIncomes: string
}

const TransactionPage: FC = () => {
  const navigate = useNavigate()
  const { privacyMode } = useContext(DrawerContext)
  const [clickedTransaction, setClickedTransaction] = useState<AugmentedTransaction | null>(null)

  const { augmentedTransactions, rootCategory } = useContext(MixedAugmentation)
  const { state: categories } = useContext(CategoryServiceContext)

  const { queryParams, updateQueryParams } = useQueryParams<QueryParams>()
  const graphType = useMemo(() => (queryParams.chart ?? 'line') as 'line' | 'pie', [queryParams.chart])
  const hideFinancialIncome = useMemo(
    () => queryParams.hideFinancialIncome === 'true',
    [queryParams.hideFinancialIncome],
  )
  const showIncomes = useMemo(() => queryParams.showIncomes === 'true', [queryParams.showIncomes])

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
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

  const { width: contentWidth, ref: setContentRef } = useElementDimensions(600, 600)

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graphSection = useMemo(
    () => (
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
                updateQueryParams({
                  showIncomes: show.toString(),
                })
              }}
            />
          )}
        </GraphContainer>

        <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>
      </GraphSectionContainer>
    ),
    [
      graphType,
      filteredTransaction,
      toDate,
      fromDate,
      hideFinancialIncome,
      categoryFilter,
      categories,
      rootCategory,
      showIncomes,
      updateQueryParams,
      filterOverview,
    ],
  )

  const listSection = useMemo(
    () => (
      <Box
        sx={{
          height: '100%',
          width: '100%',
          background: 'rgba(128,128,128,0.04)',
        }}
      >
        <Box
          sx={{
            padding: '0 1rem',
            margin: 'auto',
            width: 'calc(min(35rem, 100vw))',
          }}
        >
          <TransactionList
            items={filteredTransaction}
            onClick={(transactionId) => {
              const transaction = filteredTransaction.find((t) => t.id === transactionId)
              if (transaction) {
                setClickedTransaction(transaction)
              }
            }}
            viewAsAccounts={accountFilter === null ? undefined : accountFilter}
            ItemComponent={TransactionCard}
            additionalItemsProps={{}}
          />
        </Box>
      </Box>
    ),
    [filteredTransaction, accountFilter],
  )

  return (
    <ContentWithHeader
      title="Transactions"
      withScrolling={!splitHorizontal}
      action="menu"
      setContentRef={setContentRef}
      rightContent={
        <>
          {graphType === 'line' ? (
            <IconButton
              onClick={() => {
                updateQueryParams({ chart: 'pie' })
              }}
            >
              <IconLib.FaChartPie size="1.5rem" />
            </IconButton>
          ) : (
            <IconButton
              onClick={() => {
                updateQueryParams({ chart: 'line' })
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
                  updateQueryParams({ hideFinancialIncome: (!hideFinancialIncome).toString() })
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
                      updateQueryParams({ showIncomes: (value === 'income').toString() })
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
        <>
          {graphSection}
          {listSection}
        </>
      )}

      <BasicModal
        open={clickedTransaction !== null}
        onClose={() => setClickedTransaction(null)}
        slotProps={{
          paper: {
            style: {
              backgroundColor: 'transparent',
              borderRadius: '24px',
              border: '0',
              overflow: 'hidden',
            },
          },
        }}
      >
        {clickedTransaction !== null && (
          <FancyModal
            title={{
              topCategory:
                clickedTransaction.sender?.isMine && clickedTransaction.receiver?.isMine
                  ? 'Transfer'
                  : clickedTransaction.sender?.isMine
                    ? 'Expense'
                    : 'Income',
              bigTitle: clickedTransaction.note || 'No description',
              bottomSpec: {
                IconComponent: IconLib.MdCalendarToday,
                text: format(clickedTransaction.date, 'PPP'),
              },
            }}
            bottomMenu={[
              {
                Icon: IconLib.MdEdit,
                label: 'Edit Transaction',
                color: '#64B5F6',
                description: 'Modify transaction details',
                action: () => {
                  navigate(`/transactions/edit/${clickedTransaction.id}`)
                  setClickedTransaction(null)
                },
                disabled: false,
              },
              {
                Icon: IconLib.MdDelete,
                label: 'Delete Transaction',
                color: '#EF5350',
                description: 'Remove this transaction',
                action: () => {},
                disabled: true,
              },
            ]}
          >
            <Typography
              variant="subtitle2"
              style={{
                opacity: 0.6,
                marginBottom: '16px',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
              }}
            >
              DETAILS
            </Typography>
            <Column style={{ gap: '0.2rem' }}>
              {/* Amount */}
              <DetailCard
                delay={0}
                title={clickedTransaction.currency.symbol}
                subTitle={
                  clickedTransaction.senderId &&
                  clickedTransaction.receiverId &&
                  clickedTransaction.currency.id !== clickedTransaction.receiverCurrency.id
                    ? `Converted to ${clickedTransaction.receiverCurrency.name}`
                    : clickedTransaction.currency.name
                }
                value={`${formatAmount(clickedTransaction.currency, clickedTransaction.amount, privacyMode)}${
                  clickedTransaction.senderId &&
                  clickedTransaction.receiverId &&
                  clickedTransaction.currency.id !== clickedTransaction.receiverCurrency.id
                    ? ` > ${formatAmount(clickedTransaction.receiverCurrency, clickedTransaction.receiverAmount, privacyMode)}`
                    : ''
                }`}
              />

              {/* Category */}
              {clickedTransaction.category && (
                <DetailCard delay={1} title="Category" value={clickedTransaction.category.name} />
              )}

              {/* Sender Account */}
              {clickedTransaction.sender && (
                <DetailCard
                  delay={clickedTransaction.category ? 2 : 1}
                  title="From"
                  value={clickedTransaction.sender.name}
                />
              )}

              {/* Receiver Account */}
              {clickedTransaction.receiver && (
                <DetailCard
                  delay={(clickedTransaction.category ? 1 : 0) + (clickedTransaction.sender ? 1 : 0) + 1}
                  title="To"
                  value={clickedTransaction.receiver.name}
                />
              )}
            </Column>
          </FancyModal>
        )}
      </BasicModal>
    </ContentWithHeader>
  )
}

export default TransactionPage
