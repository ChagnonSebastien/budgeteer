import { IonFab, IonFabButton, IonFabList, IonPage, useIonRouter } from '@ionic/react'
import { isAfter, isBefore } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'

import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
import TransactionsLineChart from '../components/LineChart'
import TransactionsPieChart from '../components/PieChart'
import { TransactionList } from '../components/TransactionList'
import useTransactionFilter from '../components/useTransactionFilter'
import { AugmentedCategory } from '../domain/model/category'
import MixedAugmentation from '../service/MixedAugmentation'
import { CategoryServiceContext } from '../service/ServiceContext'

const TransactionPage: FC = () => {
  const router = useIonRouter()

  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)

  const [graphType, setGraphType] = useState<'line' | 'pie'>('line')
  const { fromDate, toDate, accountFilter, categoryFilter, overview: filterOverview } = useTransactionFilter()

  const { IconLib } = useContext(IconToolsContext)

  const filteredTransaction = useMemo(() => {
    return augmentedTransactions
      .filter((transaction) => isAfter(transaction.date, fromDate))
      .filter((transaction) => isBefore(transaction.date, toDate))
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
  }, [augmentedTransactions, categoryFilter, accountFilter, toDate, fromDate])

  return (
    <IonPage>
      <ContentWithHeader
        title="Transactions"
        button="menu"
        rightButton={
          graphType === 'line' ? (
            <IconLib.FaChartPie size="1.5rem" onClick={() => setGraphType('pie')} />
          ) : (
            <IconLib.BsGraphUp size="1.5rem" onClick={() => setGraphType('line')} />
          )
        }
      >
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <IconLib.FaPlus />
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton color="success" onClick={() => router.push('/transactions/new?type=income')}>
              <IconLib.MdInput />
            </IonFabButton>
            <IonFabButton color="danger" onClick={() => router.push('/transactions/new?type=expense')}>
              <IconLib.MdOutput />
            </IonFabButton>
            <IonFabButton color="dark" onClick={() => router.push('/transactions/new?type=transfer')}>
              <IconLib.GrTransaction />
            </IonFabButton>
          </IonFabList>
        </IonFab>

        <div style={{ height: '50%', width: '100%', position: 'relative', padding: '1rem' }}>
          {graphType === 'line' ? (
            <TransactionsLineChart
              augmentedTransactions={filteredTransaction}
              filterByAccounts={accountFilter === null ? undefined : [accountFilter]}
              toDate={toDate}
              fromDate={fromDate}
            />
          ) : (
            <TransactionsPieChart
              rootCategory={categories.find((c) => c.id === categoryFilter) ?? rootCategory}
              augmentedTransactions={filteredTransaction}
            />
          )}
        </div>

        {filterOverview}

        <TransactionList
          transactions={filteredTransaction}
          onClick={(transactionId) => {
            router.push(`/transactions/edit/${transactionId}`)
          }}
          viewAsAccounts={accountFilter === null ? undefined : [accountFilter]}
        />
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
