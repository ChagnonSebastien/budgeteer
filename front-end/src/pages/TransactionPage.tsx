import { IconButton, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material'
import { isAfter, isBefore } from 'date-fns'
import { FC, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()

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

  const [contentWidth, setContentWidth] = useState(600)
  const [contentHeight, setContentHeight] = useState(600)
  const splitHorizontal = contentWidth > 1200
  const [filterHeight, setFilterHeight] = useState(50)

  return (
    <ContentWithHeader
      title="Transactions"
      button="menu"
      rightButton={
        graphType === 'line' ? (
          <IconButton onClick={() => setGraphType('pie')}>
            <IconLib.FaChartPie size="1.5rem" />
          </IconButton>
        ) : (
          <IconButton onClick={() => setGraphType('line')}>
            <IconLib.BsGraphUp size="1.5rem" />
          </IconButton>
        )
      }
      contentMaxWidth="100%"
      contentOverflowY="hidden"
    >
      <SpeedDial
        ariaLabel="Create new transaction"
        sx={{ position: 'absolute', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon openIcon={<IconLib.FaPlus />} />}
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

      <div
        style={{
          height: '100%',
          width: '100%',
          overflowY: splitHorizontal ? 'hidden' : 'scroll',
          display: 'flex',
          flexDirection: splitHorizontal ? 'row' : 'column',
        }}
        ref={(ref) => {
          if (ref === null) return
          setContentWidth(ref.clientWidth)
          setContentHeight(ref.clientHeight)
        }}
      >
        <div
          style={{
            height: splitHorizontal ? `${contentHeight}px` : '50vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              marginTop: splitHorizontal ? `${contentHeight / 12}px` : 0,
              height: `calc( ${splitHorizontal ? `${contentHeight}px` : '50vh'} / 1.2 - ${filterHeight}px )`,
              position: 'relative',
            }}
          >
            {graphType === 'line' ? (
              <AggregatedDiffChart transactions={filteredTransaction} toDate={toDate} fromDate={fromDate} />
            ) : (
              <TransactionsPieChart
                rootCategory={categories.find((c) => c.id === categoryFilter) ?? rootCategory}
                augmentedTransactions={filteredTransaction}
              />
            )}
          </div>

          <div
            ref={(ref) => {
              if (ref === null) return
              setFilterHeight(ref.scrollHeight)
            }}
          >
            {filterOverview}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            overflowY: splitHorizontal ? 'scroll' : 'clip',
          }}
        >
          <TransactionList
            transactions={filteredTransaction}
            onClick={(transactionId) => {
              navigate(`/transactions/edit/${transactionId}`)
            }}
            viewAsAccounts={accountFilter === null ? undefined : [accountFilter]}
          />
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default TransactionPage
