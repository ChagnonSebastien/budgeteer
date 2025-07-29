import { Button, Chip, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material'
import { DateCalendar, DateView } from '@mui/x-date-pickers'
import { addDays, formatDate, isSameDay, startOfDay, subMonths, subYears } from 'date-fns'
import dayjs, { Dayjs } from 'dayjs'
import { ReactNode, useContext, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import TimeRange from './slider/TimeRange'
import Account, { AccountID } from '../../domain/model/account'
import { AccountServiceContext, CategoryServiceContext, TransactionServiceContext } from '../../service/ServiceContext'
import AccountCard from '../accounts/AccountCard'
import GroupedAccountList from '../accounts/GroupedAccountList'
import { CategoryCard } from '../categories/CategoryCard'
import { CategoryList } from '../categories/CategoryList'
import ContentDialog from '../shared/ContentDialog'
import { Row } from '../shared/NoteContainer'

type Filters = {
  overview: ReactNode
  accountFilter: number[] | null
  categoryFilter: number[] | null
  fromDate: Date
  toDate: Date
  showSlider: boolean
}

export default (accountPreFilter: (a: Account) => boolean = (_) => true, canFilterByCategory = true): Filters => {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const navigate = useNavigate()
  const accountFilter: number[] | null = query.get('accounts') ? JSON.parse(query.get('accounts')!) : null
  const categoryFilter: number[] | null = query.get('categories') ? JSON.parse(query.get('categories')!) : null

  const hasFilters = query.has('accounts') || query.has('categories')
  const [showSlider, setShowSlider] = useState(hasFilters)

  const fromDate = startOfDay(
    query.get('from') ? new Date(Number.parseInt(query.get('from')!)) : addDays(subYears(new Date(), 1), 1),
  )
  const toDate = startOfDay(query.get('to') ? new Date(Number.parseInt(query.get('to')!)) : new Date())

  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('xs'))

  const [showFilterSelection, setShowFilterSelection] = useState(false)

  const { state: transactions } = useContext(TransactionServiceContext)

  const { state: rawAccounts } = useContext(AccountServiceContext)
  const accounts = useMemo(() => rawAccounts.filter(accountPreFilter), [rawAccounts, accountPreFilter])

  const [showAccountModal, setShowAccountModal] = useState(false)

  const { state: categories } = useContext(CategoryServiceContext)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [fromView, setFromView] = useState<DateView>('day')
  const [showFromDateModal, setShowFromDateModal] = useState(false)

  const [toView, setToView] = useState<DateView>('day')
  const [showToDateModal, setShowToDateModal] = useState(false)

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
            query.delete('accounts')
          } else {
            query.set('accounts', JSON.stringify(newFilter))
          }
          navigate(`${location.pathname}?${query.toString()}`)
        }}
        label={accounts.find((a) => a.id === accountId)?.name ?? accountId}
      />
    ))
  }, [accountFilter, query])

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
            query.delete('categories')
          } else {
            query.set('categories', JSON.stringify(newFilter))
          }
          navigate(`${location.pathname}?${query.toString()}`)
        }}
        label={categories.find((c) => c.id === categoryId)?.name ?? categoryId}
      />
    ))
  }, [categoryFilter, query])

  const fromPills = useMemo(() => {
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowFromDateModal(true)
        }}
        label={`From: ${fromDate.toDateString()}`}
      />
    )
  }, [fromDate])

  const toPills = useMemo(() => {
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowToDateModal(true)
        }}
        label={`To: ${toDate.toDateString()}`}
      />
    )
  }, [toDate])

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
                query.set('from', String(startOfDay(transactions[transactions.length - 1].date).getTime()))
                query.set('to', String(startOfDay(new Date()).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }
            }}
          >
            Max
          </div>
          <div
            style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
            onClick={() => {
              if (transactions.length > 0) {
                query.set('from', String(startOfDay(addDays(subYears(new Date(), 5), 1)).getTime()))
                query.set('to', String(startOfDay(new Date()).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }
            }}
          >
            5Y
          </div>
          <div
            style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
            onClick={() => {
              if (transactions.length > 0) {
                query.set('from', String(startOfDay(addDays(subYears(new Date(), 3), 1)).getTime()))
                query.set('to', String(startOfDay(new Date()).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }
            }}
          >
            3Y
          </div>
          <div
            style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
            onClick={() => {
              if (transactions.length > 0) {
                query.set('from', String(startOfDay(addDays(subYears(new Date(), 1), 1)).getTime()))
                query.set('to', String(startOfDay(new Date()).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }
            }}
          >
            1Y
          </div>
          <div
            style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
            onClick={() => {
              if (transactions.length > 0) {
                query.set('from', String(startOfDay(addDays(subMonths(new Date(), 1), 1)).getTime()))
                query.set('to', String(startOfDay(new Date()).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }
            }}
          >
            1M
          </div>
        </Row>
        {showSlider && (
          <>
            <TimeRange
              ticksNumber={10}
              disabledIntervals={[]}
              selectedInterval={[fromDate, toDate]}
              timelineInterval={[startOfDay(transactions[transactions.length - 1].date), startOfDay(new Date())]}
              step={20}
              formatTick={(a) => formatDate(new Date(a), 'MMM yyyy')}
              onUpdateCallback={(_data: { error: boolean; time: Date[] }) => {
                /** Ignore */
              }}
              onChangeCallback={(data: Date[]) => {
                if (isSameDay(data[0], fromDate) && isSameDay(data[1], toDate)) {
                  return
                }

                query.set('from', String(startOfDay(data[0]).getTime()))
                query.set('to', String(startOfDay(data[1]).getTime()))
                navigate(`${location.pathname}?${query.toString()}`)
              }}
            />
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
      <ContentDialog
        fullScreen={fullScreen}
        open={showFilterSelection && !showFromDateModal && !showToDateModal}
        onClose={() => {
          if (!showFromDateModal) setShowFilterSelection(false)
        }}
      >
        {form}
      </ContentDialog>

      <ContentDialog fullScreen={fullScreen} open={showCategoryModal} onClose={() => setShowCategoryModal(false)}>
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
                  query.delete('categories')
                } else {
                  query.set('categories', JSON.stringify(categoryIds))
                }
                navigate(`${location.pathname}?${query.toString()}`)
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCategoryModal(false)}>Close</Button>
        </DialogActions>
      </ContentDialog>

      <ContentDialog fullScreen={fullScreen} open={showAccountModal} onClose={() => setShowAccountModal(false)}>
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
                  query.delete('accounts')
                } else {
                  query.set('accounts', JSON.stringify(items))
                }
                navigate(`${location.pathname}?${query.toString()}`)
              },
            }}
            ItemComponent={AccountCard}
            additionalItemsProps={{}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </ContentDialog>

      <ContentDialog
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
            value={dayjs(fromDate)}
            onChange={(newDate: Dayjs) => {
              query.set('from', String(newDate.toDate().getTime()))
              navigate(`${location.pathname}?${query.toString()}`)
              if (fromView === 'day') setShowFromDateModal(false)
            }}
            onViewChange={(view) => setFromView(view)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </ContentDialog>

      <ContentDialog
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
            value={dayjs(toDate)}
            onChange={(newDate: Dayjs) => {
              query.set('to', String(newDate.toDate().getTime()))
              navigate(`${location.pathname}?${query.toString()}`)
              if (toView === 'day') setShowToDateModal(false)
            }}
            onViewChange={(view) => setToView(view)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountModal(false)}>Close</Button>
        </DialogActions>
      </ContentDialog>
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
    fromDate,
    toDate,
    showSlider,
  }
}
