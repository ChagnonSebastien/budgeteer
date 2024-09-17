import { Chip, Dialog, useMediaQuery, useTheme } from '@mui/material'
import { DateCalendar, DateView, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { addDays, subMonths, subYears } from 'date-fns'
import dayjs, { Dayjs } from 'dayjs'
import { useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import { AccountServiceContext, CategoryServiceContext, TransactionServiceContext } from '../service/ServiceContext'

export default () => {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'))

  const [showFilterSelection, setShowFilterSelection] = useState(false)

  const { state: transactions } = useContext(TransactionServiceContext)

  const { state: accounts } = useContext(AccountServiceContext)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountFilter, setAccountFilter] = useState<null | number>(null)

  const { state: categories } = useContext(CategoryServiceContext)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)

  const [fromDate, setFromDate] = useState(addDays(subYears(new Date(), 1), 1))
  const [fromView, setFromView] = useState<DateView>('day')
  const [showFromDateModal, setShowFromDateModal] = useState(false)

  const [toDate, setToDate] = useState(new Date())
  const [toView, setToView] = useState<DateView>('day')
  const [showToDateModal, setShowToDateModal] = useState(false)

  const accountPills = useMemo(() => {
    if (accountFilter === null) return null
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowAccountModal(true)
        }}
        onDelete={() => setAccountFilter(null)}
        label={accounts.find((a) => a.id === accountFilter)?.name ?? accountFilter}
      />
    )
  }, [accountFilter])

  const categoryPills = useMemo(() => {
    if (categoryFilter === null) return null
    return (
      <Chip
        style={{ margin: '.25rem' }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowCategoryModal(true)
        }}
        onDelete={() => setCategoryFilter(null)}
        label={categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}
      />
    )
  }, [categoryFilter])

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
        <div style={{ padding: '1rem' }}>
          <h3 style={{ textAlign: 'center' }}>Edit filters</h3>
          <div
            style={{
              display: 'flex',
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
          </div>
          <div
            style={{
              display: 'flex',
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
          </div>
          <div
            style={{
              display: 'flex',
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
          </div>
        </div>
        <div
          style={{
            color: 'var(--ion-color-primary)',
            borderTop: '1px #8888 solid',
            textAlign: 'center',
            padding: '1rem',
            fontWeight: 'bold',
            boxShadow: ' 0rem -.25rem .5rem #CCC',
            cursor: 'pointer',
          }}
          onClick={() => setShowFilterSelection(false)}
        >
          Confirm
        </div>
      </>
    ),
    [fromPills, categoryPills, accountPills],
  )

  const overview = (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        <div
          style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
          onClick={() => {
            if (transactions.length > 0) {
              setFromDate(transactions[transactions.length - 1].date)
              setToDate(new Date())
            }
          }}
        >
          Max
        </div>
        <div
          style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
          onClick={() => {
            if (transactions.length > 0) {
              setFromDate(addDays(subYears(new Date(), 5), 1))
              setToDate(new Date())
            }
          }}
        >
          5Y
        </div>
        <div
          style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
          onClick={() => {
            if (transactions.length > 0) {
              setFromDate(addDays(subYears(new Date(), 3), 1))
              setToDate(new Date())
            }
          }}
        >
          3Y
        </div>
        <div
          style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
          onClick={() => {
            if (transactions.length > 0) {
              setFromDate(addDays(subYears(new Date(), 1), 1))
              setToDate(new Date())
            }
          }}
        >
          1Y
        </div>
        <div
          style={{ padding: '.25rem 1rem', fontWeight: 'bolder', cursor: 'pointer' }}
          onClick={() => {
            if (transactions.length > 0) {
              setFromDate(addDays(subMonths(new Date(), 1), 1))
              setToDate(new Date())
            }
          }}
        >
          1M
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          backgroundColor: '#8882',
          margin: '.5rem 2rem',
          padding: '.15rem 1rem',
          borderRadius: '1rem',
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
      </div>

      <Dialog
        fullScreen={fullScreen}
        open={showFilterSelection && !showFromDateModal && !showToDateModal}
        onClose={() => {
          if (!showFromDateModal) setShowFilterSelection(false)
        }}
      >
        {form}
      </Dialog>

      <Dialog fullScreen={fullScreen} open={showCategoryModal} onClose={() => setShowFromDateModal(false)}>
        <ContentWithHeader title="Filter by category" button="return" onCancel={() => setShowFromDateModal(false)}>
          <CategoryList
            categories={categories}
            onSelect={(categoryId) => {
              setCategoryFilter(categoryId)
              setShowCategoryModal(false)
            }}
          />
        </ContentWithHeader>
      </Dialog>

      <Dialog fullScreen={fullScreen} open={showAccountModal} onClose={() => setShowAccountModal(false)}>
        <AccountList
          accounts={accounts}
          onSelect={(accountId) => {
            setAccountFilter(accountId)
            setShowAccountModal(false)
          }}
        />
      </Dialog>

      <Dialog
        fullScreen={fullScreen}
        open={showFromDateModal}
        onClose={() => {
          setShowFromDateModal(false)
        }}
      >
        <div style={{ width: '20rem' }}>
          <DateCalendar
            views={['year', 'month', 'day']}
            value={dayjs(fromDate)}
            onChange={(newDate: Dayjs) => {
              setFromDate(newDate.toDate())
              if (fromView === 'day') setShowFromDateModal(false)
            }}
            onViewChange={(view) => setFromView(view)}
          />
        </div>
      </Dialog>

      <Dialog
        fullScreen={fullScreen}
        open={showToDateModal}
        onClose={() => {
          setShowToDateModal(false)
        }}
      >
        <div style={{ width: '20rem' }}>
          <DateCalendar
            views={['year', 'month', 'day']}
            value={dayjs(toDate)}
            onChange={(newDate: Dayjs) => {
              setToDate(newDate.toDate())
              if (toView === 'day') setShowToDateModal(false)
            }}
            onViewChange={(view) => setToView(view)}
          />
        </div>
      </Dialog>
    </LocalizationProvider>
  )

  return {
    overview,
    accountFilter,
    categoryFilter,
    fromDate,
    toDate,
  }
}
