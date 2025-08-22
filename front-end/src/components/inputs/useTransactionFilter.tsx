import { Button, Chip, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material'
import { DateCalendar, DateView, PickerValidDate } from '@mui/x-date-pickers'
import { addDays, formatDate, isSameDay, startOfDay, subMonths, subYears } from 'date-fns'
import dayjs from 'dayjs'
import { ReactNode, useContext, useMemo, useState } from 'react'

import TimeRange from './slider/TimeRange'
import Account, { AccountID } from '../../domain/model/account'
import { AccountServiceContext, CategoryServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import AccountCard from '../accounts/AccountCard'
import GroupedAccountList from '../accounts/GroupedAccountList'
import { CategoryCard } from '../categories/CategoryCard'
import { CategoryList } from '../categories/CategoryList'
import BasicModal from '../shared/BasicModal'
import { Row } from '../shared/Layout'
import useQueryParams from '../shared/useQueryParams'

type DateFiltersQueryParams = {
  from: string
  to: string
}

type DateFilters = {
  quickFilter: ReactNode
  slider: ReactNode
  fromDate: Date
  toDate: Date
}

export const useDateFilter = (): DateFilters => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<DateFiltersQueryParams>()
  const timeRange = useMemo(
    () => [
      qp.from ? startOfDay(new Date(Number.parseInt(qp.from)!)) : startOfDay(addDays(subYears(new Date(), 1), 1)),
      qp.to ? startOfDay(new Date(Number.parseInt(qp.to)!)) : startOfDay(new Date()),
    ],
    [qp.from, qp.to],
  )

  const { state: transactions } = useContext(TransactionServiceContext)

  const quickFilter = (
    <Row
      style={{
        flexGrow: 1,
        justifyContent: 'space-around',
      }}
    >
      <div
        style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
        onClick={() => {
          if (transactions.length > 0) {
            updateQueryParams({
              from: String(startOfDay(transactions[transactions.length - 1].date).getTime()),
              to: String(startOfDay(new Date()).getTime()),
            })
          }
        }}
      >
        Max
      </div>
      <div
        style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
        onClick={() => {
          updateQueryParams({
            from: String(startOfDay(addDays(subYears(new Date(), 5), 1)).getTime()),
            to: String(startOfDay(new Date()).getTime()),
          })
        }}
      >
        5Y
      </div>
      <div
        style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
        onClick={() => {
          updateQueryParams({
            from: String(startOfDay(addDays(subYears(new Date(), 3), 1)).getTime()),
            to: String(startOfDay(new Date()).getTime()),
          })
        }}
      >
        3Y
      </div>
      <div
        style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
        onClick={() => {
          updateQueryParams({
            from: String(startOfDay(addDays(subYears(new Date(), 1), 1)).getTime()),
            to: String(startOfDay(new Date()).getTime()),
          })
        }}
      >
        1Y
      </div>
      <div
        style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
        onClick={() => {
          updateQueryParams({
            from: String(startOfDay(addDays(subMonths(new Date(), 1), 1)).getTime()),
            to: String(startOfDay(new Date()).getTime()),
          })
        }}
      >
        1M
      </div>
    </Row>
  )

  const slider = (
    <TimeRange
      ticksNumber={10}
      disabledIntervals={[]}
      selectedInterval={timeRange}
      timelineInterval={[startOfDay(transactions[transactions.length - 1].date), startOfDay(new Date())]}
      step={20}
      formatTick={(a) => formatDate(new Date(a), 'MMM yyyy')}
      onUpdateCallback={(_data: { error: boolean; time: Date[] }) => {
        /** Ignore */
      }}
      onChangeCallback={(data: Date[]) => {
        if (isSameDay(data[0], timeRange[0]) && isSameDay(data[1], timeRange[1])) {
          return
        }

        updateQueryParams({
          from: String(startOfDay(data[0]).getTime()),
          to: String(startOfDay(data[1]).getTime()),
        })
      }}
    />
  )

  return {
    quickFilter: quickFilter,
    slider: slider,
    fromDate: timeRange[0],
    toDate: timeRange[1],
  }
}

type TransactionFiltersQueryParams = {
  accounts: string
  categories: string
  from: string
  to: string
}

type TransactionFilters = {
  overview: ReactNode
  accountFilter: number[] | null
  categoryFilter: number[] | null
  fromDate: Date
  toDate: Date
}

const useTransactionFilter = (
  accountPreFilter: (a: Account) => boolean = (_) => true,
  canFilterByCategory = true,
): TransactionFilters => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<TransactionFiltersQueryParams>()
  const accountFilter = useMemo<number[] | null>(() => JSON.parse(qp.accounts ?? null), [qp.accounts])
  const categoryFilter = useMemo<number[] | null>(() => JSON.parse(qp.categories ?? null), [qp.categories])

  const { quickFilter, toDate, fromDate, slider } = useDateFilter()
  const timeRange = useMemo<[Date, Date]>(() => [fromDate, toDate], [fromDate, toDate])

  const hasFilters = accountFilter !== null || categoryFilter !== null
  const [showSlider, setShowSlider] = useState(hasFilters)

  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'))

  const [showFilterSelection, setShowFilterSelection] = useState(false)

  const { state: categories } = useContext(CategoryServiceContext)
  const { state: rawAccounts } = useContext(AccountServiceContext)

  const accounts = useMemo(() => rawAccounts.filter(accountPreFilter), [rawAccounts, accountPreFilter])

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showFromDateModal, setShowFromDateModal] = useState(false)
  const [showToDateModal, setShowToDateModal] = useState(false)

  const [fromView, setFromView] = useState<DateView>('day')
  const [toView, setToView] = useState<DateView>('day')

  const accountPills = useMemo(() => {
    if (accountFilter === null) return null
    return accountFilter.map((accountId) => (
      <Chip
        key={accountId}
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowAccountModal(true)
        }}
        onDelete={() => {
          const newFilter = accountFilter.filter((a) => a != accountId)
          if (newFilter.length === 0) {
            updateQueryParams({ accounts: null })
          } else {
            updateQueryParams({ accounts: JSON.stringify(newFilter) })
          }
        }}
        label={accounts.find((a) => a.id === accountId)?.name ?? accountId}
      />
    ))
  }, [accountFilter, updateQueryParams])

  const categoryPills = useMemo(() => {
    if (categoryFilter === null) return null
    return categoryFilter.map((categoryId) => (
      <Chip
        key={categoryId}
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowCategoryModal(true)
        }}
        onDelete={() => {
          const newFilter = categoryFilter.filter((c) => c != categoryId)
          if (newFilter.length === 0) {
            updateQueryParams({ categories: null })
          } else {
            updateQueryParams({ categories: JSON.stringify(newFilter) })
          }
        }}
        label={categories.find((c) => c.id === categoryId)?.name ?? categoryId}
      />
    ))
  }, [categoryFilter, updateQueryParams])

  const fromPills = useMemo(() => {
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowFromDateModal(true)
        }}
        label={`From: ${timeRange[0].toDateString()}`}
      />
    )
  }, [timeRange[0]])

  const toPills = useMemo(() => {
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowToDateModal(true)
        }}
        label={`To: ${timeRange[1].toDateString()}`}
      />
    )
  }, [timeRange[1]])

  const form = useMemo(
    () => (
      <>
        <DialogTitle>Edit filters</DialogTitle>
        <DialogContent>
          <Row
            style={{
              borderBottom: '1px #8885 solid',
              marginBottom: '1rem',
              padding: '.5rem',
              alignItems: 'center',
            }}
            onClick={() => setShowAccountModal(true)}
          >
            <div>Account:</div>
            <div style={{ width: '.5rem' }} />
            <div style={{ flexGrow: 1, minWidth: '20rem', flexWrap: 'wrap' }}>{accountPills}</div>
          </Row>
          {canFilterByCategory && (
            <Row
              style={{
                borderBottom: '1px #8885 solid',
                marginBottom: '1rem',
                padding: '.5rem',
                alignItems: 'center',
              }}
              onClick={() => setShowCategoryModal(true)}
            >
              <div>Category:</div>
              <div style={{ width: '.5rem' }} />
              <div style={{ flexGrow: 1, minWidth: '10rem' }}>{categoryPills}</div>
            </Row>
          )}
          <Row
            style={{
              borderBottom: '1px #8885 solid',
              marginBottom: '1rem',
              padding: '.5rem',
              alignItems: 'center',
            }}
            onClick={() => setShowFromDateModal(true)}
          >
            <div>Date:</div>
            <div style={{ width: '.5rem' }} />
            <div style={{ flexGrow: 1, minWidth: '10rem' }}>
              {fromPills}
              {toPills}
            </div>
          </Row>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowFilterSelection(false)}>Close</Button>
        </DialogActions>
      </>
    ),
    [fromPills, categoryPills, accountPills],
  )

  const quickDates = (
    <Row
      style={{
        backgroundColor: '#8882',
        borderRadius: '.5rem',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '.75rem 0',
          flexGrow: 1,
        }}
      >
        {quickFilter}
        {showSlider && (
          <>
            {slider}
            <div style={{ marginTop: '.75rem', padding: '0 1.5rem' }}>
              <Row
                style={{
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => setShowFilterSelection(true)}
              >
                <div>
                  {fromPills}
                  {toPills}
                  {categoryPills}
                  {accountPills}
                </div>
                <div style={{ flexGrow: 1 }} />
                <div style={{ margin: '.25rem', width: 'intrinsic', flexShrink: 0 }}>+ Filter</div>
              </Row>
            </div>
          </>
        )}
      </div>
      <Row
        style={{ backgroundColor: '#0003', padding: '1rem', cursor: 'pointer', alignItems: 'center' }}
        onClick={() => setShowSlider((prev) => !prev)}
      >
        {showSlider ? '-' : '+'}
      </Row>
    </Row>
  )

  const overview = showSlider ? (
    <>
      <BasicModal
        fullScreen={fullScreen}
        open={showFilterSelection && !showFromDateModal && !showToDateModal}
        onClose={() => {
          if (!showFromDateModal) setShowFilterSelection(false)
        }}
      >
        {form}
      </BasicModal>

      <BasicModal fullScreen={fullScreen} open={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
        <DialogTitle>Filter by category</DialogTitle>
        <DialogContent style={{ height: '70vh', overflowY: 'auto', padding: '0 20px' }}>
          <CategoryList
            ItemComponent={CategoryCard}
            additionalItemsProps={{}}
            items={categories}
            selectConfiguration={{
              mode: 'multi',
              selectedItems: categoryFilter ?? [],
              onSelectItems: (categoryIds) => {
                if (categoryIds.length === 0) {
                  updateQueryParams({ categories: null })
                } else {
                  updateQueryParams({ categories: JSON.stringify(categoryIds) })
                }
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCategoryModal(false)}>Close</Button>
        </DialogActions>
      </BasicModal>

      <BasicModal fullScreen={fullScreen} open={showAccountModal} onClose={() => setShowAccountModal(false)}>
        <DialogTitle>Pick Account</DialogTitle>
        <DialogContent style={{ height: '70vh', overflow: 'hidden' }}>
          <GroupedAccountList
            items={accounts}
            filterable
            showZeroBalances={true}
            selectConfiguration={{
              mode: 'multi',
              selectedItems: accountFilter ?? [],
              onSelectItems: (items: AccountID[]) => {
                if (items.length === 0) {
                  updateQueryParams({ accounts: null })
                } else {
                  updateQueryParams({ accounts: JSON.stringify(items) })
                }
              },
            }}
            ItemComponent={AccountCard}
            additionalItemsProps={{}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </BasicModal>

      <BasicModal
        fullScreen={fullScreen}
        open={showFromDateModal}
        onClose={() => {
          setShowFromDateModal(false)
        }}
      >
        <DialogTitle>From Date</DialogTitle>
        <DialogContent>
          <DateCalendar
            views={['year', 'month', 'day']}
            value={dayjs(timeRange[0])}
            onChange={(newDate: PickerValidDate | null) => {
              if (newDate === null) return
              updateQueryParams({ from: String(newDate.toDate().getTime()) })
              if (fromView === 'day') setShowFromDateModal(false)
            }}
            onViewChange={(view) => setFromView(view)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </BasicModal>

      <BasicModal
        fullScreen={fullScreen}
        open={showToDateModal}
        onClose={() => {
          setShowToDateModal(false)
        }}
      >
        <DialogTitle>To Date</DialogTitle>
        <DialogContent>
          <DateCalendar
            views={['year', 'month', 'day']}
            value={dayjs(timeRange[1])}
            onChange={(newDate: PickerValidDate | null) => {
              if (newDate === null) return
              updateQueryParams({ to: String(newDate.toDate().getTime()) })
              if (toView === 'day') setShowToDateModal(false)
            }}
            onViewChange={(view) => setToView(view)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </BasicModal>
    </>
  ) : null

  const overviewWithToggle = (
    <div style={{ position: 'relative' }}>
      {quickDates}
      {overview}
    </div>
  )

  return {
    overview: overviewWithToggle,
    accountFilter,
    categoryFilter,
    fromDate: timeRange[0],
    toDate: timeRange[1],
  }
}

export default useTransactionFilter
