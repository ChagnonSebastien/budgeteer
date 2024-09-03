import { IonChip, IonDatetime, IonModal } from '@ionic/react'
import { addDays, subMonths, subYears } from 'date-fns'
import { useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import { IconToolsContext } from './IconTools'
import { AccountServiceContext, CategoryServiceContext, TransactionServiceContext } from '../service/ServiceContext'

export default () => {
  const [showFilterSelection, setShowFilterSelection] = useState(false)

  const { state: transactions } = useContext(TransactionServiceContext)

  const { state: accounts } = useContext(AccountServiceContext)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountFilter, setAccountFilter] = useState<null | number>(null)

  const { state: categories } = useContext(CategoryServiceContext)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)

  const [fromDate, setFromDate] = useState(addDays(subYears(new Date(), 1), 1))
  const [showFromDateModal, setShowFromDateModal] = useState(false)

  const [toDate, setToDate] = useState(new Date())
  const [showToDateModal, setShowToDateModal] = useState(false)

  const { IconLib } = useContext(IconToolsContext)

  const accountPills = useMemo(() => {
    if (accountFilter === null) return null
    return (
      <IonChip
        style={{ flexShrink: 0 }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowAccountModal(true)
        }}
      >
        {accounts.find((a) => a.id === accountFilter)?.name ?? accountFilter}
        <div style={{ width: '.5rem' }} />
        <IconLib.IoCloseCircle
          onClick={(ev) => {
            ev.stopPropagation()
            setAccountFilter(null)
          }}
          size="1.28rem"
        />
      </IonChip>
    )
  }, [accountFilter])

  const categoryPills = useMemo(() => {
    if (categoryFilter === null) return null
    return (
      <IonChip
        style={{ flexShrink: 0 }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowCategoryModal(true)
        }}
      >
        {categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}
        <div style={{ width: '.5rem' }} />
        <IconLib.IoCloseCircle
          onClick={(ev) => {
            ev.stopPropagation()
            setCategoryFilter(null)
          }}
          size="1.28rem"
        />
      </IonChip>
    )
  }, [categoryFilter])

  const fromPills = useMemo(() => {
    return (
      <IonChip
        style={{ flexShrink: 0 }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowFromDateModal(true)
        }}
      >
        From: {fromDate.toDateString()}
      </IonChip>
    )
  }, [fromDate])

  const toPills = useMemo(() => {
    return (
      <IonChip
        style={{ flexShrink: 0 }}
        onClick={(ev) => {
          ev.stopPropagation()
          setShowToDateModal(true)
        }}
      >
        To: {toDate.toDateString()}
      </IonChip>
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
    <>
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

      <IonModal
        id="filter-modal"
        isOpen={showFilterSelection && !showFromDateModal && !showToDateModal}
        onWillDismiss={() => {
          if (!showFromDateModal) setShowFilterSelection(false)
        }}
        style={{
          '--height': 'fit-content',
          '--width': 'fit-content',
          '--max-width': '50rem',
        }}
      >
        {form}
      </IonModal>

      <IonModal isOpen={showCategoryModal} onWillDismiss={() => setShowFromDateModal(false)}>
        <ContentWithHeader title="Filter by category" button="return" onCancel={() => setShowFromDateModal(false)}>
          <CategoryList
            categories={categories}
            onSelect={(categoryId) => {
              setCategoryFilter(categoryId)
              setShowCategoryModal(false)
            }}
          />
        </ContentWithHeader>
      </IonModal>

      <IonModal isOpen={showAccountModal} onWillDismiss={() => setShowAccountModal(false)}>
        <AccountList
          title="Filter by Account"
          button="none"
          onCancel={() => setShowAccountModal(false)}
          accounts={accounts}
          onSelect={(accountId) => {
            setAccountFilter(accountId)
            setShowAccountModal(false)
          }}
        />
      </IonModal>

      <IonModal
        isOpen={showFromDateModal}
        onWillDismiss={() => {
          setShowFromDateModal(false)
        }}
        style={{
          '--height': 'fit-content',
          '--width': 'fit-content',
          '--max-width': '50rem',
        }}
      >
        <div style={{ width: '20rem' }}>
          <IonDatetime
            value={fromDate.toISOString()}
            showDefaultTitle
            presentation="date"
            showDefaultButtons
            onIonChange={(ev) => {
              setFromDate(new Date(ev.detail.value as string))
            }}
          />
        </div>
      </IonModal>

      <IonModal
        isOpen={showToDateModal}
        onWillDismiss={() => {
          setShowToDateModal(false)
        }}
        style={{
          '--height': 'fit-content',
          '--width': 'fit-content',
          '--max-width': '50rem',
        }}
      >
        <div style={{ width: '20rem' }}>
          <IonDatetime
            value={toDate.toISOString()}
            showDefaultTitle
            presentation="date"
            showDefaultButtons
            onIonChange={(ev) => {
              setToDate(new Date(ev.detail.value as string))
            }}
          />
        </div>
      </IonModal>
    </>
  )

  return {
    overview,
    accountFilter,
    categoryFilter,
    fromDate,
    toDate,
  }
}