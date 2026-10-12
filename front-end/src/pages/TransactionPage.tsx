import { Box, Checkbox, IconButton, Menu, MenuItem, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { format, isAfter, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import AggregatedDiffChart from '../components/graphing/AggregatedDiffChart'
import { FirstDivision, GraphContainer } from '../components/graphing/GraphStyledComponents'
import TransactionsPieChart from '../components/graphing/PieChart'
import { IconToolsContext } from '../components/icons/IconTools'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import { DrawerContext } from '../components/Menu'
import ActionSpeedDial, { DialAction } from '../components/shared/ActionSpeedDial'
import ConfirmDeleteModal from '../components/shared/ConfirmDeleteModal'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { DetailCard, DetailHeading, FancyDialog, FancyModal } from '../components/shared/FancyModal'
import { EmptyState } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useToast } from '../components/shared/ToastProvider'
import useCloseOnBack, { useNavigateFromDialog } from '../components/shared/useCloseOnBack'
import useQueryParams from '../components/shared/useQueryParams'
import useWideLayout from '../components/shared/useWideLayout'
import TransactionCard from '../components/transactions/TransactionCard'
import { TransactionList } from '../components/transactions/TransactionList'
import { AugmentedCategory } from '../domain/model/category'
import { formatAmount } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext, TransactionServiceContext } from '../service/ServiceContext'

type QueryParams = {
  chart: string
  hideFinancialIncome: string
  showIncomes: string
}

const TransactionPage: FC = () => {
  const navigate = useNavigateFromDialog()
  const location = useLocation()
  const currentUrl = `${location.pathname}${location.search}`
  const { privacyMode } = useContext(DrawerContext)
  const [clickedTransaction, setClickedTransaction] = useState<AugmentedTransaction | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<AugmentedTransaction | null>(null)

  const { augmentedTransactions, rootCategory } = useContext(MixedAugmentation)
  const { state: categories } = useContext(CategoryServiceContext)
  const { delete: deleteTransaction } = useContext(TransactionServiceContext)
  const { showToast } = useToast()

  const { queryParams, updateQueryParams } = useQueryParams<QueryParams>()
  const graphType = useMemo(() => (queryParams.chart ?? 'line') as 'line' | 'pie', [queryParams.chart])
  const hideFinancialIncome = useMemo(
    () => queryParams.hideFinancialIncome === 'true',
    [queryParams.hideFinancialIncome],
  )
  const showIncomes = useMemo(() => queryParams.showIncomes === 'true', [queryParams.showIncomes])

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  useCloseOnBack(anchorEl !== null, () => setAnchorEl(null))
  const open = Boolean(anchorEl)
  const {
    fromDate,
    toDate,
    dateNavigation,
    accountFilter,
    categoryFilter,
    overview: filterOverview,
  } = useTransactionFilter()
  const prefillAccountId = accountFilter?.length === 1 ? accountFilter[0] : null

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

  const splitHorizontal = useWideLayout()
  const hasTransactions = augmentedTransactions.length > 0

  const firstDivision = (
    <Box component={FirstDivision} sx={{ justifyContent: 'center' }}>
      <Box
        component={GraphContainer}
        sx={{ position: 'relative', height: '60vh', minHeight: 'max(50vh, 300px)', display: 'flex' }}
      >
        {graphType === 'line' ? (
          <AggregatedDiffChart
            transactions={filteredTransaction}
            toDate={toDate}
            fromDate={fromDate}
            hideFinancialIncome={hideFinancialIncome}
            navigation={dateNavigation}
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
      </Box>

      <Box sx={{ p: 2 }}>{filterOverview}</Box>
    </Box>
  )

  const secondDivision = (
    <Box sx={{ bgcolor: splitHorizontal ? undefined : 'surface.subtle', px: 2, flexGrow: 1 }}>
      <TransactionList
        items={filteredTransaction}
        onClick={(transactionId) => {
          const transaction = filteredTransaction.find((t) => t.id === transactionId)
          if (transaction) {
            setClickedTransaction(transaction)
          }
        }}
        ItemComponent={TransactionCard}
        additionalItemsProps={{}}
      />
    </Box>
  )

  return (
    <ContentWithHeader
      title="Transactions"
      action="menu"
      withScrolling={!splitHorizontal}
      scrollEndSx={{ bgcolor: 'surface.subtle' }}
      rightContent={
        hasTransactions ? (
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
        ) : undefined
      }
    >
      {!hasTransactions ? (
        <EmptyState
          title="No transactions yet"
          description="Record what you spend and earn, and your balances, charts and trends fill in."
        />
      ) : splitHorizontal ? (
        <SplitView
          first={firstDivision}
          second={secondDivision}
          split="horizontal"
          firstZoneStyling={{ grow: true, scroll: true }}
          secondZoneStyling={{ grow: false, scroll: true }}
        />
      ) : (
        <Stack sx={{ width: '100%', minHeight: '100%', flexShrink: 0 }}>
          {firstDivision}
          {secondDivision}
        </Stack>
      )}

      <ActionSpeedDial
        ariaLabel="Create new transaction"
        hint={hasTransactions ? undefined : 'Record your first transaction'}
        actions={[
          ...(
            [
              ['Expense', 'expense', IconLib.MdOutput, 'money.loss'],
              ['Income', 'income', IconLib.MdInput, 'money.gain'],
              ['Transfer', 'transfer', IconLib.GrTransaction, 'grey.500'],
            ] as const
          ).map(
            ([label, type, Icon, color]): DialAction => ({
              label,
              Icon,
              color,
              onClick: () =>
                navigate(`/transactions/new?type=${type}`, { state: { from: currentUrl, prefillAccountId } }),
            }),
          ),
          {
            label: 'Import CSV',
            Icon: IconLib.FaFileImport,
            color: 'primary.main',
            onClick: () => navigate('/transactions/import', { state: { prefillAccountId } }),
          },
        ]}
      />

      <FancyDialog open={clickedTransaction !== null} onClose={() => setClickedTransaction(null)}>
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
                intent: 'edit',
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
                intent: 'destructive',
                description: 'Remove this transaction',
                action: () => {
                  setTransactionToDelete(clickedTransaction)
                },
                disabled: false,
              },
            ]}
          >
            <DetailHeading>DETAILS</DetailHeading>
            <Stack spacing={0.5}>
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

              {/* Financial Income */}
              {clickedTransaction.augmentedFinancialIncomeData && (
                <DetailCard
                  delay={
                    (clickedTransaction.category ? 1 : 0) +
                    (clickedTransaction.sender ? 1 : 0) +
                    (clickedTransaction.receiver ? 1 : 0) +
                    1
                  }
                  title="Financial Income"
                  subTitle="From investment in"
                  value={clickedTransaction.augmentedFinancialIncomeData.relatedCurrency.symbol}
                />
              )}
            </Stack>
          </FancyModal>
        )}
      </FancyDialog>

      <ConfirmDeleteModal
        open={transactionToDelete !== null}
        title="Delete transaction?"
        description={`This permanently removes${
          transactionToDelete?.note ? ` "${transactionToDelete.note}"` : ' this transaction'
        }. This cannot be undone.`}
        onCancel={() => setTransactionToDelete(null)}
        onConfirm={() => {
          const target = transactionToDelete
          if (target === null) return Promise.resolve()
          return deleteTransaction({ id: target.id }).then(
            () => {
              setTransactionToDelete(null)
              setClickedTransaction(null)
              showToast('Transaction deleted')
            },
            (err) => {
              showToast('Failed to delete transaction', 'error')
              console.error(err)
            },
          )
        }}
      />
    </ContentWithHeader>
  )
}

export default TransactionPage
