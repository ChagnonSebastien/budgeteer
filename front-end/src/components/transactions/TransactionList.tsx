import { Box, Typography } from '@mui/material'
import { formatDate, isSameMonth } from 'date-fns'
import { useMemo } from 'react'

import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemListProps } from '../accounts/ItemList'
import useScrollParentVirtualizer from '../shared/useScrollParentVirtualizer'

interface AdditionalTransactionListProps {
  onClick: (transactionId: number, transaction: AugmentedTransaction) => void
}

type Props<T> = ItemListProps<TransactionID, AugmentedTransaction, T> & AdditionalTransactionListProps

type Row = { kind: 'month'; date: Date } | { kind: 'item'; transaction: AugmentedTransaction }

const estimatedRowHeight = { month: 48, item: 96 }

export const TransactionList = <T,>(props: Props<T>) => {
  const { items, ItemComponent, onClick, additionalItemsProps } = props

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = []
    let previous: Date | null = null
    for (const transaction of items) {
      if (previous === null || !isSameMonth(previous, transaction.date))
        result.push({ kind: 'month', date: transaction.date })
      previous = transaction.date
      result.push({ kind: 'item', transaction })
    }
    return result
  }, [items])

  const { listRef, virtualizer, scrollMargin } = useScrollParentVirtualizer({
    count: rows.length,
    estimateSize: (index) => estimatedRowHeight[rows[index].kind],
    getItemKey: (index) => {
      const row = rows[index]
      return row.kind === 'month' ? `month-${row.date.getTime()}` : row.transaction.listKey
    },
    overscan: 8,
  })

  return (
    <Box
      ref={listRef}
      sx={{
        position: 'relative',
        mx: 'auto',
        width: (t) => t.contentWidth.narrow,
        maxWidth: '100%',
        height: virtualizer.getTotalSize(),
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index]
        return (
          <Box
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              pb: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
            style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
          >
            {row.kind === 'month' ? (
              <Typography fontWeight={700} sx={{ alignSelf: 'center', pt: 2, pb: 1 }}>
                {formatDate(row.date, 'MMMM yyyy')}
              </Typography>
            ) : (
              <ItemComponent
                item={row.transaction}
                onClick={() => onClick(row.transaction.id, row.transaction)}
                {...additionalItemsProps}
              />
            )}
          </Box>
        )
      })}
    </Box>
  )
}
