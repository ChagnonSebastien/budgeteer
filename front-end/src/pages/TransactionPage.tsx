import { IonFab, IonFabButton, IonFabList, useIonRouter } from '@ionic/react'
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material'
import { isAfter, isBefore } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'

import AggregatedDiffChart from '../components/AggregatedDiffChart'
import ContentWithHeader from '../components/ContentWithHeader'
import { IconToolsContext } from '../components/IconTools'
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
      <SpeedDial
        ariaLabel="Create new transaction"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon openIcon={<IconLib.FaPlus />} />}
      >
        <SpeedDialAction
          sx={{ backgroundColor: 'green' }}
          onClick={() => router.push('/transactions/new?type=income')}
          icon={<IconLib.MdInput />}
        />
        <SpeedDialAction
          sx={{ backgroundColor: 'red' }}
          onClick={() => router.push('/transactions/new?type=expense')}
          icon={<IconLib.MdOutput />}
        />
        <SpeedDialAction
          sx={{ backgroundColor: 'darkgrey' }}
          onClick={() => router.push('/transactions/new?type=transfer')}
          icon={<IconLib.GrTransaction />}
        />
      </SpeedDial>

      <div style={{ height: '50%', width: '100%', position: 'relative', padding: '1rem' }}>
        {graphType === 'line' ? (
          <AggregatedDiffChart transactions={filteredTransaction} toDate={toDate} fromDate={fromDate} />
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
  )
}

export default TransactionPage
