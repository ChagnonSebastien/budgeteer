import { Box, Stack, Typography } from '@mui/material'
import { formatDate, isSameMonth } from 'date-fns'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemListProps } from '../accounts/ItemList'

const chunkSize = 100

interface AdditionalTransactionListProps {
  onClick: (transactionId: number, transaction: AugmentedTransaction) => void
}

type Props<T> = ItemListProps<TransactionID, AugmentedTransaction, T> & AdditionalTransactionListProps

const MonthLabel = ({ date }: { date: Date }) => (
  <Typography fontWeight={700} sx={{ alignSelf: 'center', pt: 2, pb: 1 }}>
    {formatDate(date, 'MMMM yyyy')}
  </Typography>
)

export const TransactionList = <T,>(props: Props<T>) => {
  const { items, ItemComponent, onClick, additionalItemsProps } = props

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)
  useEffect(() => {
    setDisplayedAmount(chunkSize)
  }, [items])

  const viewWithMonthLabels: ReactNode[] = useMemo(() => {
    const view: ReactNode[] = []
    let previous: Date | null = null
    for (const transaction of items) {
      if (previous === null || !isSameMonth(previous, transaction.date)) {
        view.push(<MonthLabel key={`monthly-label-${transaction.date.getTime()}`} date={transaction.date} />)
      }
      previous = transaction.date
      view.push(
        <ItemComponent
          key={transaction.listKey}
          item={transaction}
          onClick={() => onClick(transaction.id, transaction)}
          {...additionalItemsProps}
        />,
      )
    }
    return view
  }, [items])

  const displayedItems = useMemo(
    () => viewWithMonthLabels.slice(0, displayedAmount),
    [viewWithMonthLabels, displayedAmount],
  )

  const loadMoreRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setDisplayedAmount((prevState) => Math.min(prevState + chunkSize, viewWithMonthLabels.length))
      }
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [])

  return (
    <Stack spacing={1} sx={{ position: 'relative', mx: 'auto', width: '100%', maxWidth: (t) => t.contentWidth.narrow }}>
      {displayedItems}
      <Box ref={loadMoreRef} sx={{ height: '100vh', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: -1 }} />
    </Stack>
  )
}
