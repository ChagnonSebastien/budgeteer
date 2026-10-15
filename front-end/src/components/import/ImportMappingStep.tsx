import {
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, ReactNode, useMemo } from 'react'

import { ImportMapping, RowParse } from '../../domain/import/mapping'
import Currency, { formatFull } from '../../domain/model/currency'

const sampleSize = 8

const kindLabels = {
  expense: 'Expense',
  income: 'Income',
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  fee: 'Fee',
  conversion: 'Conversion',
  stockDividend: 'Stock dividend',
}

interface Props {
  headers: string[]
  mapping: ImportMapping
  onChange(mapping: ImportMapping): void
  accountCurrencies: Currency[]
  currencies: Currency[]
  parses: RowParse[]
  onBack(): void
  onNext(): void
}

const ColumnSelect: FC<{
  label: string
  headers: string[]
  value: string | null
  optional?: boolean
  onChange(value: string | null): void
}> = ({ label, headers, value, optional = false, onChange }) => (
  <TextField
    select
    variant="standard"
    label={label}
    value={value ?? ''}
    onChange={(ev) => onChange(ev.target.value === '' ? null : ev.target.value)}
    sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
  >
    {optional && <MenuItem value="">None</MenuItem>}
    {headers.map((header) => (
      <MenuItem key={header} value={header}>
        {header}
      </MenuItem>
    ))}
  </TextField>
)

const Row: FC<{ children: ReactNode }> = ({ children }) => (
  <Stack direction="row" useFlexGap spacing={2} flexWrap="wrap" alignItems="flex-end">
    {children}
  </Stack>
)

const ImportMappingStep: FC<Props> = (props) => {
  const { headers, mapping, onChange, accountCurrencies, currencies, parses, onBack, onNext } = props
  const set = (patch: Partial<ImportMapping>) => onChange({ ...mapping, ...patch })

  const sample = useMemo(() => parses.slice(0, sampleSize), [parses])
  const failures = useMemo(() => parses.filter((p) => p.outcome !== 'parsed').length, [parses])
  const ready =
    mapping.dateColumn !== '' &&
    mapping.descriptionColumn !== '' &&
    (mapping.amount.kind === 'signed'
      ? mapping.amount.column !== ''
      : mapping.amount.debit !== '' && mapping.amount.credit !== '')

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Row>
        <TextField
          select
          variant="standard"
          label="Encoding"
          value={mapping.encoding}
          onChange={(ev) => set({ encoding: ev.target.value as ImportMapping['encoding'] })}
          sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
        >
          <MenuItem value="utf-8">UTF-8</MenuItem>
          <MenuItem value="windows-1252">Windows-1252</MenuItem>
        </TextField>
        <TextField
          variant="standard"
          type="number"
          label="Lines to skip"
          value={mapping.skipLines}
          onChange={(ev) => set({ skipLines: Math.max(0, Math.floor(Number(ev.target.value) || 0)) })}
          sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
        />
        <FormControlLabel
          control={<Switch checked={mapping.hasHeader} onChange={(ev) => set({ hasHeader: ev.target.checked })} />}
          label="Header row"
        />
      </Row>

      <Row>
        <ColumnSelect
          label="Date"
          headers={headers}
          value={mapping.dateColumn}
          onChange={(v) => set({ dateColumn: v ?? '' })}
        />
        <TextField
          select
          variant="standard"
          label="Date format"
          value={mapping.dateOrder}
          onChange={(ev) => set({ dateOrder: ev.target.value as ImportMapping['dateOrder'] })}
          sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
        >
          <MenuItem value="ymd">YYYY-MM-DD</MenuItem>
          <MenuItem value="dmy">DD/MM/YYYY</MenuItem>
          <MenuItem value="mdy">MM/DD/YYYY</MenuItem>
        </TextField>
      </Row>

      <ColumnSelect
        label="Description"
        headers={headers}
        value={mapping.descriptionColumn}
        onChange={(v) => set({ descriptionColumn: v ?? '' })}
      />

      <Stack spacing={1}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mapping.amount.kind}
          onChange={(_ev, kind) => {
            if (kind === 'signed') set({ amount: { kind, column: '' } })
            if (kind === 'split') set({ amount: { kind, debit: '', credit: '' } })
          }}
        >
          <ToggleButton value="signed">One signed amount</ToggleButton>
          <ToggleButton value="split">Debit and credit</ToggleButton>
        </ToggleButtonGroup>
        <Row>
          {mapping.amount.kind === 'signed' ? (
            <ColumnSelect
              label="Amount"
              headers={headers}
              value={mapping.amount.column}
              onChange={(v) => set({ amount: { kind: 'signed', column: v ?? '' } })}
            />
          ) : (
            <>
              <ColumnSelect
                label="Debit (money out)"
                headers={headers}
                value={mapping.amount.debit}
                onChange={(v) =>
                  mapping.amount.kind === 'split' && set({ amount: { ...mapping.amount, debit: v ?? '' } })
                }
              />
              <ColumnSelect
                label="Credit (money in)"
                headers={headers}
                value={mapping.amount.credit}
                onChange={(v) =>
                  mapping.amount.kind === 'split' && set({ amount: { ...mapping.amount, credit: v ?? '' } })
                }
              />
            </>
          )}
          <TextField
            select
            variant="standard"
            label="Decimal separator"
            value={mapping.decimalSeparator}
            onChange={(ev) => set({ decimalSeparator: ev.target.value as ImportMapping['decimalSeparator'] })}
            sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
          >
            <MenuItem value=".">Period (12.34)</MenuItem>
            <MenuItem value=",">Comma (12,34)</MenuItem>
          </TextField>
        </Row>
        <FormControlLabel
          control={<Switch checked={mapping.invertSign} onChange={(ev) => set({ invertSign: ev.target.checked })} />}
          label="Invert sign (credit cards reporting charges as positive)"
        />
      </Stack>

      <Row>
        <ColumnSelect
          label="Currency column"
          optional
          headers={headers}
          value={mapping.currencyColumn}
          onChange={(v) => set({ currencyColumn: v })}
        />
        <TextField
          select
          variant="standard"
          label="Default currency"
          value={mapping.defaultCurrency}
          onChange={(ev) => set({ defaultCurrency: Number(ev.target.value) })}
          sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
        >
          {accountCurrencies.map((currency) => (
            <MenuItem key={currency.id} value={currency.id}>
              {currency.name}
            </MenuItem>
          ))}
        </TextField>
      </Row>

      <Stack spacing={1}>
        <Typography variant="subtitle2">Brokerage (optional)</Typography>
        <Row>
          <ColumnSelect
            label="Symbol"
            optional
            headers={headers}
            value={mapping.symbolColumn}
            onChange={(v) => set({ symbolColumn: v })}
          />
          <ColumnSelect
            label="Quantity"
            optional
            headers={headers}
            value={mapping.quantityColumn}
            onChange={(v) => set({ quantityColumn: v })}
          />
          <ColumnSelect
            label="Unit price"
            optional
            headers={headers}
            value={mapping.priceColumn}
            onChange={(v) => set({ priceColumn: v })}
          />
        </Row>
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {parses.length} rows{failures > 0 ? `, ${failures} need attention` : ''}
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Line</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sample.map((parse) => {
              const currency =
                parse.outcome === 'parsed' ? currencies.find((c) => c.id === parse.row.currencyId) : undefined
              return (
                <TableRow key={parse.line}>
                  <TableCell>{parse.line}</TableCell>
                  <TableCell>{parse.outcome === 'parsed' ? formatDate(parse.row.date, 'yyyy-MM-dd') : ''}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: (t) => t.fieldWidth.sm,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {parse.description}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {parse.outcome === 'parsed' && currency
                      ? `${kindLabels[parse.row.kind]} ${formatFull(currency, parse.row.cash)}`
                      : parse.outcome === 'blocked'
                        ? `Unknown symbol ${parse.symbol}`
                        : parse.outcome === 'unparseable'
                          ? parse.reason
                          : parse.outcome === 'combined'
                            ? `Folded into line ${parse.into}`
                            : ''}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Stack>

      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button color="inherit" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" disabled={!ready || parses.length === 0} onClick={onNext}>
          Preview
        </Button>
      </Stack>
    </Stack>
  )
}

export default ImportMappingStep
