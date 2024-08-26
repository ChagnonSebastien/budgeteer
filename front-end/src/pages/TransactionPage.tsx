import { IonAlert, IonChip, IonFab, IonFabButton, IonFabList, IonModal, IonPage, useIonRouter } from '@ionic/react'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { AccountList } from '../components/AccountList'
import { CategoryList } from '../components/CategoryList'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import TransactionsLineChart from '../components/LineChart'
import TransactionsPieChart from '../components/PieChart'
import { TransactionList } from '../components/TransactionList'
import { AugmentedCategory } from '../domain/model/category'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext, CategoryServiceContext } from '../service/ServiceContext'

const TransactionPage: FC = () => {
  const router = useIonRouter()

  const { augmentedTransactions } = useContext(MixedAugmentation)

  const [graphType, setGraphType] = useState<'line' | 'pie'>('line')
  const [showFilterSelection, setShowFilterSelection] = useState(false)

  const { state: accounts } = useContext(AccountServiceContext)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [accountFilter, setAccountFilter] = useState<null | number>(null)

  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)

  const { iconTypeFromName } = useContext(IconToolsContext)
  const FaPlus = useMemo(() => iconTypeFromName('FaPlus'), [iconTypeFromName])
  const GrTransaction = useMemo(() => iconTypeFromName('GrTransaction'), [iconTypeFromName])
  const MdOutput = useMemo(() => iconTypeFromName('MdOutput'), [iconTypeFromName])
  const MdInput = useMemo(() => iconTypeFromName('MdInput'), [iconTypeFromName])
  const IoCloseCircle = useMemo(() => iconTypeFromName('IoCloseCircle'), [iconTypeFromName])
  const BsGraphUp = useMemo(() => iconTypeFromName('BsGraphUp'), [iconTypeFromName])
  const FaChartPie = useMemo(() => iconTypeFromName('FaChartPie'), [iconTypeFromName])

  const filteredTransaction = useMemo(() => {
    return augmentedTransactions
      .filter((transaction) => {
        if (accountFilter === null) return true
        return transaction.senderId === accountFilter || transaction.receiverId === accountFilter
      })
      .filter((transaction) => {
        if (categoryFilter === null) return true
        let category: AugmentedCategory | undefined = transaction.category
        while (typeof category !== 'undefined') {
          if (category.id === categoryFilter) return true
          category = category.parent
        }
        return false
      })
  }, [augmentedTransactions, categoryFilter, accountFilter])

  return (
    <IonPage>
      <ContentWithHeader
        title="Transactions"
        button="menu"
        rightButton={
          graphType === 'line' ? (
            <FaChartPie size="1.5rem" onClick={() => setGraphType('pie')} />
          ) : (
            <BsGraphUp size="1.5rem" onClick={() => setGraphType('line')} />
          )
        }
      >
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <FaPlus />
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton color="success" onClick={() => router.push('/transactions/new?type=income')}>
              <MdInput />
            </IonFabButton>
            <IonFabButton color="danger" onClick={() => router.push('/transactions/new?type=expense')}>
              <MdOutput />
            </IonFabButton>
            <IonFabButton color="dark" onClick={() => router.push('/transactions/new?type=transfer')}>
              <GrTransaction />
            </IonFabButton>
          </IonFabList>
        </IonFab>

        <div style={{ height: '50%', width: '100%', position: 'relative', padding: '1rem' }}>
          {graphType === 'line' ? (
            <TransactionsLineChart
              augmentedTransactions={filteredTransaction}
              viewAsAccounts={accountFilter === null ? undefined : [accountFilter]}
              includeInitialAmounts={categoryFilter === null}
            />
          ) : (
            <TransactionsPieChart
              rootCategory={categories.find((c) => c.id === categoryFilter) ?? rootCategory}
              augmentedTransactions={filteredTransaction}
            />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            backgroundColor: '#8882',
            margin: '.5rem 2rem',
            padding: '.15rem 1rem',
            borderRadius: '1rem',
            alignItems: 'center',
          }}
          onClick={() => setShowFilterSelection(true)}
        >
          {categoryFilter !== null && (
            <IonChip
              onClick={(ev) => {
                ev.stopPropagation()
                setShowCategoryModal(true)
              }}
            >
              {categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter}
              <div style={{ width: '.5rem' }} />
              <IoCloseCircle
                onClick={(ev) => {
                  ev.stopPropagation()
                  setCategoryFilter(null)
                }}
                size="1.28rem"
              />
            </IonChip>
          )}
          {accountFilter !== null && (
            <IonChip
              onClick={(ev) => {
                ev.stopPropagation()
                setShowAccountModal(true)
              }}
            >
              {accounts.find((a) => a.id === accountFilter)?.name ?? accountFilter}
              <div style={{ width: '.5rem' }} />
              <IoCloseCircle
                onClick={(ev) => {
                  ev.stopPropagation()
                  setAccountFilter(null)
                }}
                size="1.28rem"
              />
            </IonChip>
          )}
          <div style={{ flexGrow: 1 }} />
          <div style={{ margin: '.25rem' }}>+ Filter</div>
        </div>

        <TransactionList
          transactions={filteredTransaction}
          onClick={(transactionId) => {
            router.push(`/transactions/edit/${transactionId}`)
          }}
          viewAsAccounts={accountFilter === null ? undefined : [accountFilter]}
          includeInitialAmounts={categoryFilter === null}
        />

        <IonAlert
          isOpen={showFilterSelection}
          onWillDismiss={() => setShowFilterSelection(false)}
          header="Select your favorite color"
          buttons={['Cancel']}
          inputs={[
            {
              label: 'Filter by Category',
              type: 'radio',
              value: 'category',
              handler: () => {
                setShowFilterSelection(false)
                setShowCategoryModal(true)
              },
            },
            {
              label: 'Filter by Account',
              type: 'radio',
              value: 'account',
              handler: () => {
                setShowFilterSelection(false)
                setShowAccountModal(true)
              },
            },
          ]}
        ></IonAlert>

        <IonModal isOpen={showCategoryModal} onWillDismiss={() => setShowCategoryModal(false)}>
          <ContentWithHeader title="Filter by category" button="return" onCancel={() => setShowCategoryModal(false)}>
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
          <ContentWithHeader title={`Filter by account`} button="return" onCancel={() => setShowAccountModal(false)}>
            <AccountList
              accounts={accounts}
              onSelect={(accountId) => {
                setAccountFilter(accountId)
                setShowAccountModal(false)
              }}
            />
          </ContentWithHeader>
        </IonModal>
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
