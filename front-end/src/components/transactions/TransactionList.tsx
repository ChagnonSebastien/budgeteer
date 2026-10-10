import { Box, Typography } from '@mui/material'
import { useVirtualizer } from '@tanstack/react-virtual'
import { formatDate, isSameMonth } from 'date-fns'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { AugmentedTransaction, TransactionID } from '../../domain/model/transaction'
import { ItemListProps } from '../accounts/ItemList'

interface AdditionalTransactionListProps {
  onClick: (transactionId: number, transaction: AugmentedTransaction) => void
}

type Props<T> = ItemListProps<TransactionID, AugmentedTransaction, T> & AdditionalTransactionListProps

type Row = { kind: 'month'; date: Date } | { kind: 'item'; transaction: AugmentedTransaction }

const estimatedRowHeight = { month: 48, item: 96 }

const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return document.scrollingElement as HTMLElement | null
}

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

  const listRef = useRef<HTMLDivElement>(null)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    setScrollElement(findScrollParent(listRef.current))
  }, [])

  // The list sits below other content in a shared scroll container; its offset moves when that content resizes.
  useLayoutEffect(() => {
    if (!listRef.current || !scrollElement) return
    const offset =
      listRef.current.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop
    if (Math.abs(offset - scrollMargin) > 1) setScrollMargin(offset)
  })

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement,
    estimateSize: (index) => estimatedRowHeight[rows[index].kind],
    getItemKey: (index) => {
      const row = rows[index]
      return row.kind === 'month' ? `month-${row.date.getTime()}` : row.transaction.listKey
    },
    overscan: 8,
    scrollMargin,
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
