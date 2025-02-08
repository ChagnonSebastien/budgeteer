import { IconButton, SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material'
import { isAfter, isBefore, isSameDay } from 'date-fns'
import { FC, useContext, useEffect, useMemo, useState } from 'react'
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
          if (category.id === categoryFilter) return true
          category = category.parent
        }
        return false
      })
  }, [augmentedTransactions, categoryFilter, accountFilter, toDate, fromDate])

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentWidth, setContentWidth] = useState(600)
  const [contentHeight, setContentHeight] = useState(600)
  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentWidth(ref.clientWidth)
      setContentHeight(ref.clientHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  const [filterRef, setFilterRef] = useState<HTMLDivElement | null>(null)
  const [filterHeight, setFilterHeight] = useState(50)
  useEffect(() => {
    if (filterRef === null) return
    const ref = filterRef

    const callback = () => {
      setFilterHeight(ref.scrollHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [filterRef])

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

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
      contentPadding="1rem 0 0 0"
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
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: splitHorizontal ? 'row' : 'column',
        }}
        ref={setContentRef}
      >
        <div
          style={{
            height: splitHorizontal ? `${contentHeight}px` : '80vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              marginTop: splitHorizontal ? `${contentHeight / 12}px` : 0,
              height: `calc( ${splitHorizontal ? `${contentHeight}px` : '80vh'} / 1.2 - ${filterHeight}px )`,
              width: splitHorizontal ? `calc( ${contentWidth}px - 35rem )` : `${contentWidth}px`,
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

          <div ref={setFilterRef}>{filterOverview}</div>
        </div>

        <div
          style={{
            flexShrink: 0,
            overflowY: splitHorizontal ? 'scroll' : 'clip',
            padding: '0 1rem',
            width: splitHorizontal ? '35rem' : undefined,
          }}
        >
          <TransactionList
            transactions={filteredTransaction}
            onClick={(transactionId) => {
              navigate(`/transactions/edit/${transactionId}`)
            }}
            viewAsAccounts={accountFilter === null ? undefined : accountFilter}
          />
        </div>
      </div>
    </ContentWithHeader>
  )
}

export default TransactionPage
