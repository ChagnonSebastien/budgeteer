import { Box, Button, Chip, Stack, useMediaQuery, useTheme } from '@mui/material'
import { DateCalendar, DateView, PickerValidDate } from '@mui/x-date-pickers'
import {
  addDays,
  addHours,
  differenceInMonths,
  formatDate,
  isAfter,
  isSameDay,
  max,
  min,
  startOfDay,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'
import dayjs from 'dayjs'
import { FC, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import TimeRange from './slider/TimeRange'
import Account, { AccountID } from '../../domain/model/account'
import { AccountServiceContext, CategoryServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import AccountCard from '../accounts/AccountCard'
import GroupedAccountList from '../accounts/GroupedAccountList'
import { CategoryCard } from '../categories/CategoryCard'
import { CategoryList } from '../categories/CategoryList'
import { DateNavigation } from '../graphing/TimerangeGraphUtils'
import AppDialog from '../shared/AppDialog'
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
  dateNavigation: DateNavigation
}

const presets: { label: string; from: (today: Date) => Date }[] = [
  { label: '5Y', from: (today) => subYears(today, 5) },
  { label: '3Y', from: (today) => subYears(today, 3) },
  { label: '1Y', from: (today) => subYears(today, 1) },
  { label: '3M', from: (today) => subMonths(today, 3) },
  { label: '1M', from: (today) => subMonths(today, 1) },
  { label: '1W', from: (today) => subWeeks(today, 1) },
]
const maxPresets = 5

const nearestDay = (time: number) => startOfDay(addHours(time, 12))
const minNavigationSpanMs = 7 * 24 * 60 * 60 * 1000
const sameDays = (a: [Date, Date], b: [Date, Date]) => isSameDay(a[0], b[0]) && isSameDay(a[1], b[1])

const PresetButton: FC<{ label: string; onClick(): void }> = ({ label, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      py: 0.5,
      px: { xs: 1, sm: 2 },
      fontWeight: 'bolder',
      cursor: 'pointer',
      '@media (pointer: coarse)': { py: 1.25 },
    }}
  >
    {label}
  </Box>
)

const FilterRow: FC<{ label: string; onClick(): void; children: ReactNode }> = ({ label, onClick, children }) => (
  <Stack
    direction="row"
    spacing={1}
    alignItems="center"
    onClick={onClick}
    sx={{ borderBottom: 1, borderColor: 'border.default', mb: 2, p: 1 }}
  >
    <span>{label}</span>
    <Box sx={{ flexGrow: 1, minWidth: (t) => t.fieldWidth.sm }}>{children}</Box>
  </Stack>
)

export const useDateFilter = (): DateFilters => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<DateFiltersQueryParams>()
  const { state: transactions } = useContext(TransactionServiceContext)

  const today = startOfDay(new Date())
  const historyStart = min([startOfDay(transactions.at(-1)?.date ?? today), subWeeks(today, 1)])

  const urlRange = useMemo<[Date, Date]>(
    () => [
      qp.from
        ? startOfDay(new Date(Number.parseInt(qp.from)!))
        : max([startOfDay(addDays(subYears(new Date(), 1), 1)), historyStart]),
      qp.to ? startOfDay(new Date(Number.parseInt(qp.to)!)) : startOfDay(new Date()),
    ],
    [qp.from, qp.to, historyStart.getTime()],
  )

  const [pendingRange, setPendingRange] = useState<[Date, Date] | null>(null)
  const pendingRef = useRef(pendingRange)
  pendingRef.current = pendingRange
  const committedRef = useRef<[Date, Date] | null>(null)
  // A commit landing mid-gesture must not drop the range the gesture has since moved to.
  useEffect(() => {
    const ownCommit = committedRef.current !== null && sameDays(committedRef.current, urlRange)
    committedRef.current = null
    setPendingRange((pending) => (pending && ownCommit && !sameDays(pending, urlRange) ? pending : null))
  }, [urlRange])
  const timeRange = pendingRange ?? urlRange

  const preview = useCallback(
    (from: Date, to: Date): [Date, Date] => {
      const span = Math.min(
        Math.max(to.getTime() - from.getTime(), minNavigationSpanMs),
        today.getTime() - historyStart.getTime(),
      )
      const end = Math.min(Math.max(to.getTime(), historyStart.getTime() + span), today.getTime())
      const rounded: [Date, Date] = [nearestDay(end - span), nearestDay(end)]
      const current = pendingRef.current ?? urlRange
      if (!sameDays(rounded, current)) {
        pendingRef.current = rounded
        setPendingRange(rounded)
      }
      return [new Date(end - span), new Date(end)]
    },
    [urlRange, today.getTime(), historyStart.getTime()],
  )

  const commit = useCallback(
    (replace = true) => {
      const pending = pendingRef.current
      if (!pending) return
      if (sameDays(pending, urlRange)) {
        setPendingRange(null)
        return
      }
      committedRef.current = pending
      updateQueryParams({ from: String(pending[0].getTime()), to: String(pending[1].getTime()) }, replace)
    },
    [urlRange, updateQueryParams],
  )

  const dateNavigation = useMemo(() => ({ range: timeRange, preview, commit }), [timeRange, preview, commit])

  const fittingPresets = presets.filter((preset) => isAfter(preset.from(today), historyStart)).slice(0, maxPresets)

  const quickFilter = (
    <Stack direction="row" justifyContent="space-around" sx={{ flexGrow: 1 }}>
      <PresetButton
        label="Max"
        onClick={() => updateQueryParams({ from: String(historyStart.getTime()), to: String(today.getTime()) })}
      />
      {fittingPresets.map((preset) => (
        <PresetButton
          key={preset.label}
          label={preset.label}
          onClick={() =>
            updateQueryParams({
              from: String(addDays(preset.from(today), 1).getTime()),
              to: String(today.getTime()),
            })
          }
        />
      ))}
    </Stack>
  )

  const slider = (
    <TimeRange
      ticksNumber={10}
      disabledIntervals={[]}
      selectedInterval={timeRange}
      timelineInterval={[historyStart, today]}
      step={20}
      formatTick={(a) => formatDate(new Date(a), differenceInMonths(today, historyStart) < 3 ? 'MMM d' : 'MMM yyyy')}
      onUpdateCallback={({ time }: { error: boolean; time: Date[] }) => preview(time[0], time[1])}
      onChangeCallback={(time: Date[]) => {
        preview(time[0], time[1])
        commit(false)
      }}
    />
  )

  return {
    quickFilter: quickFilter,
    slider: slider,
    fromDate: timeRange[0],
    toDate: timeRange[1],
    dateNavigation,
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
  dateNavigation: DateNavigation
}

interface TransactionFilterOptions {
  accountPreFilter?: (a: Account) => boolean
  canFilterByCategory?: boolean
  canFilterByAccount?: boolean
}

const allAccounts = (_: Account) => true

const useTransactionFilter = ({
  accountPreFilter = allAccounts,
  canFilterByCategory = true,
  canFilterByAccount = true,
}: TransactionFilterOptions = {}): TransactionFilters => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<TransactionFiltersQueryParams>()
  const accountFilter = useMemo<number[] | null>(() => JSON.parse(qp.accounts ?? null), [qp.accounts])
  const categoryFilter = useMemo<number[] | null>(() => JSON.parse(qp.categories ?? null), [qp.categories])

  const { quickFilter, toDate, fromDate, slider, dateNavigation } = useDateFilter()
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
        sx={{ m: 0.5 }}
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
        sx={{ m: 0.5 }}
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
        sx={{ m: 0.5 }}
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
        sx={{ m: 0.5 }}
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
        {canFilterByAccount && (
          <FilterRow label="Account:" onClick={() => setShowAccountModal(true)}>
            {accountPills}
          </FilterRow>
        )}
        {canFilterByCategory && (
          <FilterRow label="Category:" onClick={() => setShowCategoryModal(true)}>
            {categoryPills}
          </FilterRow>
        )}
        <FilterRow label="Date:" onClick={() => setShowFromDateModal(true)}>
          {fromPills}
          {toPills}
        </FilterRow>
      </>
    ),
    [fromPills, categoryPills, accountPills],
  )

  const quickDates = (
    <Stack direction="row" sx={{ bgcolor: 'surface.raised', borderRadius: (t) => t.radius.md, overflow: 'hidden' }}>
      <Box sx={{ py: 1.5, flexGrow: 1, minWidth: 0 }}>
        {quickFilter}
        {showSlider && (
          <>
            {slider}
            <Stack
              direction="row"
              alignItems="center"
              onClick={() => setShowFilterSelection(true)}
              sx={{ mt: 1.5, px: { xs: 1.5, sm: 3 }, cursor: 'pointer' }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {fromPills}
                {toPills}
                {categoryPills}
                {accountPills}
              </Box>
              <Box sx={{ m: 0.5, flexShrink: 0 }}>
                {canFilterByAccount || canFilterByCategory ? '+ Filter' : 'Edit dates'}
              </Box>
            </Stack>
          </>
        )}
      </Box>
      <Stack
        justifyContent="center"
        onClick={() => setShowSlider((prev) => !prev)}
        sx={{ bgcolor: 'surface.shade', p: 2, flexShrink: 0, cursor: 'pointer' }}
      >
        {showSlider ? '-' : '+'}
      </Stack>
    </Stack>
  )

  const dateCalendar = (value: Date, setView: (view: DateView) => void, onPick: (date: Date) => void) => (
    <DateCalendar
      views={['year', 'month', 'day']}
      value={dayjs(value)}
      onChange={(newDate: PickerValidDate | null) => {
        if (newDate !== null) onPick(newDate.toDate())
      }}
      onViewChange={setView}
    />
  )

  const overview = showSlider ? (
    <>
      <AppDialog
        fullScreen={fullScreen}
        open={showFilterSelection && !showFromDateModal && !showToDateModal}
        onClose={() => {
          if (!showFromDateModal) setShowFilterSelection(false)
        }}
        title="Edit filters"
        actions={
          <Button color="inherit" onClick={() => setShowFilterSelection(false)}>
            Close
          </Button>
        }
      >
        {form}
      </AppDialog>

      <AppDialog
        fullScreen={fullScreen}
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Filter by category"
        contentSx={{ maxHeight: '70vh' }}
        actions={
          <Button color="inherit" onClick={() => setShowCategoryModal(false)}>
            Close
          </Button>
        }
      >
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
      </AppDialog>

      <AppDialog
        fullScreen={fullScreen}
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Filter by account"
        contentSx={{ maxHeight: '70vh' }}
        actions={
          <Button color="inherit" onClick={() => setShowAccountModal(false)}>
            Close
          </Button>
        }
      >
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
      </AppDialog>

      <AppDialog
        fullScreen={fullScreen}
        open={showFromDateModal}
        onClose={() => setShowFromDateModal(false)}
        title="From date"
        actions={
          <Button color="inherit" onClick={() => setShowFromDateModal(false)}>
            Close
          </Button>
        }
      >
        {dateCalendar(timeRange[0], setFromView, (date) => {
          updateQueryParams({ from: String(date.getTime()) })
          if (fromView === 'day') setShowFromDateModal(false)
        })}
      </AppDialog>

      <AppDialog
        fullScreen={fullScreen}
        open={showToDateModal}
        onClose={() => setShowToDateModal(false)}
        title="To date"
        actions={
          <Button color="inherit" onClick={() => setShowToDateModal(false)}>
            Close
          </Button>
        }
      >
        {dateCalendar(timeRange[1], setToView, (date) => {
          updateQueryParams({ to: String(date.getTime()) })
          if (toView === 'day') setShowToDateModal(false)
        })}
      </AppDialog>
    </>
  ) : null

  const overviewWithToggle = (
    <Box sx={{ position: 'relative' }}>
      {quickDates}
      {overview}
    </Box>
  )

  return {
    overview: overviewWithToggle,
    accountFilter,
    categoryFilter,
    fromDate: timeRange[0],
    toDate: timeRange[1],
    dateNavigation,
  }
}

export default useTransactionFilter
