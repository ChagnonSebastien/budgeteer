import { Box, Button, Checkbox, Chip, FormControlLabel, IconButton, Stack, TextField, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, memo, useContext, useMemo } from 'react'

import { outflowKinds, ParsedRow } from '../../domain/import/mapping'
import {
  effectiveCategory,
  isImportable,
  isTrade,
  isTransferChoice,
  PreviewRow,
  RowChoice,
  RowStatus,
} from '../../domain/import/preview'
import Account, { AccountID } from '../../domain/model/account'
import Currency, { formatFull } from '../../domain/model/currency'
import Transaction from '../../domain/model/transaction'
import { CategoryServiceContext } from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import { IconToolsContext } from '../icons/IconTools'
import AccountPicker from '../inputs/AccountPicker'
import useScrollParentVirtualizer from '../shared/useScrollParentVirtualizer'

const statusLabels: Record<RowStatus, string> = {
  new: 'New',
  imported: 'Already imported',
  duplicate: 'Possible duplicate',
  transferMatch: 'Transfer match',
  transferSuggestion: 'Transfer suggestion',
  unparseable: 'Unparseable',
  blocked: 'Unknown symbol',
  combined: 'Combined',
}

const statusColors: Record<RowStatus, 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  new: 'success',
  imported: 'default',
  duplicate: 'warning',
  transferMatch: 'info',
  transferSuggestion: 'info',
  unparseable: 'error',
  blocked: 'error',
  combined: 'default',
}

const tradeLabels: Partial<Record<ParsedRow['kind'], string>> = { buy: 'Buy ', sell: 'Sell ', conversion: 'Convert ' }

interface RowProps {
  row: PreviewRow
  choice: RowChoice
  importAccountId: AccountID
  accounts: Account[]
  currencies: Currency[]
  transactions: Transaction[]
  onChange(key: number, choice: RowChoice): void
  onCreateCurrency(symbol: string): void
}

const ImportRowCard: FC<RowProps> = memo(
  ({ row, choice, importAccountId, accounts, currencies, transactions, onChange, onCreateCurrency }) => {
    const { state: categories } = useContext(CategoryServiceContext)
    const { IconLib } = useContext(IconToolsContext)
    const parsed: ParsedRow | null = row.parse.outcome === 'parsed' ? row.parse.row : null
    const currency = parsed ? currencies.find((c) => c.id === parsed.currencyId) : undefined
    const outflow = parsed ? outflowKinds.includes(parsed.kind) : false
    const trade = parsed !== null && isTrade(parsed)
    const transfer = isTransferChoice(choice, accounts)
    const categoryId = parsed ? effectiveCategory(parsed, choice, accounts, transactions) : null
    const category = categories.find((c) => c.id === categoryId)
    const excluded = useMemo(() => [importAccountId], [importAccountId])
    const transferAccount = row.transfer ? accounts.find((a) => a.id === row.transfer!.accountId) : undefined
    const transferChecked = row.transfer !== null && choice.counterparty.id === row.transfer.accountId

    const set = (patch: Partial<RowChoice>) => onChange(row.key, { ...choice, ...patch })

    return (
      <Stack
        spacing={1}
        sx={{ p: 1.5, borderRadius: 2, bgcolor: 'surface.subtle', opacity: choice.included ? 1 : 0.6 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Checkbox
            sx={{ p: 0 }}
            checked={choice.included}
            disabled={!isImportable(row)}
            onChange={(ev) => set({ included: ev.target.checked })}
          />
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {parsed ? formatDate(parsed.date, 'yyyy-MM-dd') : `Line ${row.parse.line}`}
          </Typography>
          <Typography
            variant="body2"
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.parse.description}
          </Typography>
          {parsed && currency && (
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ whiteSpace: 'nowrap', color: trade ? 'text.primary' : outflow ? 'money.loss' : 'money.gain' }}
            >
              {trade ? tradeLabels[parsed.kind] : outflow ? '-' : '+'}
              {formatFull(currency, parsed.cash)}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" useFlexGap spacing={1} flexWrap="wrap" alignItems="center">
          <Chip size="small" label={statusLabels[row.status]} color={statusColors[row.status]} />
          {row.payeeSource === 'fuzzy' && choice.counterparty.id === row.payee.id && (
            <Chip size="small" variant="outlined" label="Suggested" />
          )}
          {row.parse.outcome === 'unparseable' && (
            <Typography variant="caption" color="error">
              {row.parse.reason}
            </Typography>
          )}
          {row.parse.outcome === 'combined' && (
            <Typography variant="caption" color="text.secondary">
              Folded into line {row.parse.into}
            </Typography>
          )}
          {row.parse.outcome === 'blocked' && (
            <Button size="small" onClick={() => onCreateCurrency((row.parse as { symbol: string }).symbol)}>
              Create {row.parse.symbol}
            </Button>
          )}
          {row.transfer && transferAccount && isImportable(row) && (
            <FormControlLabel
              sx={{ ml: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={transferChecked}
                  onChange={(ev) =>
                    set(
                      ev.target.checked
                        ? {
                            counterparty: { id: transferAccount.id, name: transferAccount.name },
                            mergeInto: row.transfer!.mergeInto,
                            included: true,
                          }
                        : { counterparty: row.payee, mergeInto: null },
                    )
                  }
                />
              }
              label={
                <Typography variant="caption">
                  {row.transfer.stored
                    ? `Merge with ${transferAccount.name} on ${formatDate(row.transfer.stored.date, 'yyyy-MM-dd')}`
                    : `Transfer with ${transferAccount.name}`}
                </Typography>
              }
            />
          )}
        </Stack>

        {parsed && isImportable(row) && choice.mergeInto === null && (
          <TextField
            variant="standard"
            size="small"
            label="Description"
            value={choice.note ?? parsed.description}
            onChange={(ev) => set({ note: ev.target.value === parsed.description ? null : ev.target.value })}
          />
        )}

        {parsed && !trade && isImportable(row) && (
          <Stack direction="row" useFlexGap spacing={2} flexWrap="wrap">
            <Stack
              direction="row"
              alignItems="center"
              sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.md}, 100%)` }}
            >
              <Box sx={{ flex: 1 }}>
                <AccountPicker
                  labelText={outflow ? 'Paid to' : 'Received from'}
                  valueText={choice.counterparty.name}
                  itemDisplayText={(item) => item?.name ?? choice.counterparty.name}
                  excludeIds={excluded}
                  allowNew
                  onAccountSelected={({ id, name }) => set({ counterparty: { id, name }, mergeInto: null })}
                />
              </Box>
              {(choice.counterparty.id !== null || choice.counterparty.name !== '') && (
                <IconButton
                  aria-label="Clear account"
                  onClick={() => set({ counterparty: { id: null, name: '' }, mergeInto: null })}
                >
                  <IconLib.MdCancel />
                </IconButton>
              )}
            </Stack>
            {!transfer && (
              <Box sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.md}, 100%)` }}>
                <CategoryPicker
                  labelText="Category"
                  valueText={category?.name ?? 'Root category'}
                  selectedConfig={{
                    mode: 'single',
                    selectedItem: categoryId,
                    onSelectItem: (id) => set({ categoryId: id }),
                  }}
                />
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    )
  },
)

interface Props {
  rows: PreviewRow[]
  choices: (row: PreviewRow) => RowChoice
  importAccountId: AccountID
  accounts: Account[]
  currencies: Currency[]
  transactions: Transaction[]
  onChange(key: number, choice: RowChoice): void
  onCreateCurrency(symbol: string): void
}

export const ImportPreviewList: FC<Props> = (props) => {
  // The virtualizer instance is stable while its output changes: compiler memoization freezes the rendered rows.
  'use no memo'
  const { rows, choices, ...rowProps } = props
  const { listRef, virtualizer, scrollMargin } = useScrollParentVirtualizer({
    count: rows.length,
    estimateSize: () => 132,
    getItemKey: (index) => rows[index].key,
    overscan: 6,
  })

  return (
    <Box ref={listRef} sx={{ position: 'relative', width: '100%', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index]
        return (
          <Box
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            sx={{ position: 'absolute', top: 0, left: 0, width: '100%', pb: 1 }}
            style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
          >
            <ImportRowCard row={row} choice={choices(row)} {...rowProps} />
          </Box>
        )
      })}
    </Box>
  )
}
