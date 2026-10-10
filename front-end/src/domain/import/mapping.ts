import { normalizeStatementName } from './matching'
import { CsvTable, DateOrder, DecimalSeparator, Encoding, parseDate, parseMinorUnits } from './parsing'
import { sameForSearch } from '../../utils'
import Currency, { CurrencyID } from '../model/currency'

export type AmountColumns = { kind: 'signed'; column: string } | { kind: 'split'; debit: string; credit: string }

export interface ImportMapping {
  encoding: Encoding
  skipLines: number
  hasHeader: boolean
  dateColumn: string
  dateOrder: DateOrder
  amount: AmountColumns
  decimalSeparator: DecimalSeparator
  invertSign: boolean
  descriptionColumn: string
  currencyColumn: string | null
  defaultCurrency: CurrencyID
  symbolColumn: string | null
  quantityColumn: string | null
}

export const defaultMapping = (headers: string[], defaultCurrency: CurrencyID): ImportMapping => {
  const find = (...patterns: RegExp[]) => headers.find((h) => patterns.some((p) => p.test(h))) ?? ''
  const debit = find(/debit|retrait|withdraw/i)
  const credit = find(/credit|dép[oô]t|deposit/i)
  return {
    encoding: 'utf-8',
    skipLines: 0,
    hasHeader: true,
    dateColumn: find(/date/i) || (headers[0] ?? ''),
    dateOrder: 'ymd',
    amount:
      debit && credit && debit !== credit
        ? { kind: 'split', debit, credit }
        : { kind: 'signed', column: find(/amount|montant/i) },
    decimalSeparator: '.',
    invertSign: false,
    descriptionColumn: find(/desc|libell|payee|merchant|marchand|name/i),
    currencyColumn: null,
    defaultCurrency,
    symbolColumn: null,
    quantityColumn: null,
  }
}

export type RowKind = 'expense' | 'income' | 'buy' | 'sell' | 'dividend' | 'fee'

export const outflowKinds: RowKind[] = ['expense', 'fee']

export interface ParsedRow {
  date: Date
  description: string
  statementName: string
  kind: RowKind
  cash: number
  currencyId: CurrencyID
  security: { currencyId: CurrencyID; quantity: number } | null
}

export type RowParse =
  | { line: number; description: string; outcome: 'parsed'; row: ParsedRow }
  | { line: number; description: string; outcome: 'unparseable'; reason: string }
  | { line: number; description: string; outcome: 'blocked'; symbol: string }

const findCurrency = (currencies: Currency[], value: string): Currency | undefined =>
  currencies.find((c) => sameForSearch(c.name, value)) ?? currencies.find((c) => sameForSearch(c.symbol, value))

export const parseRows = (table: CsvTable, mapping: ImportMapping, currencies: Currency[]): RowParse[] => {
  const column = (name: string | null) => (name ? table.headers.indexOf(name) : -1)
  const dateIndex = column(mapping.dateColumn)
  const descriptionIndex = column(mapping.descriptionColumn)
  const currencyIndex = column(mapping.currencyColumn)
  const symbolIndex = column(mapping.symbolColumn)
  const quantityIndex = column(mapping.quantityColumn)
  const signedIndex = mapping.amount.kind === 'signed' ? column(mapping.amount.column) : -1
  const debitIndex = mapping.amount.kind === 'split' ? column(mapping.amount.debit) : -1
  const creditIndex = mapping.amount.kind === 'split' ? column(mapping.amount.credit) : -1
  const defaultCurrency = currencies.find((c) => c.id === mapping.defaultCurrency)

  return table.rows.map((record, i): RowParse => {
    const line = i + 1 + mapping.skipLines + (mapping.hasHeader ? 1 : 0)
    const cell = (index: number) => (index >= 0 ? (record[index] ?? '').trim() : '')
    const description = cell(descriptionIndex)
    const unparseable = (reason: string): RowParse => ({ line, description, outcome: 'unparseable', reason })

    const date = parseDate(cell(dateIndex), mapping.dateOrder)
    if (date === null) return unparseable(`Unreadable date "${cell(dateIndex)}"`)

    const currencyText = cell(currencyIndex)
    const currency = currencyText ? findCurrency(currencies, currencyText) : defaultCurrency
    if (typeof currency === 'undefined') return unparseable(`Unknown currency "${currencyText}"`)

    const parse = (raw: string) => parseMinorUnits(raw, mapping.decimalSeparator, currency.decimalPoints)
    let signed: number | null
    if (mapping.amount.kind === 'signed') {
      signed = parse(cell(signedIndex))
    } else {
      const debit = cell(debitIndex) ? parse(cell(debitIndex)) : 0
      const credit = cell(creditIndex) ? parse(cell(creditIndex)) : 0
      signed = debit === null || credit === null ? null : Math.abs(credit) - Math.abs(debit)
    }
    if (signed === null) return unparseable(`Unreadable amount for ${currency.symbol}`)
    if (mapping.invertSign) signed = -signed
    if (signed === 0) return unparseable('Zero amount')

    const symbol = cell(symbolIndex)
    let security: ParsedRow['security'] = null
    let kind: RowKind = signed < 0 ? 'expense' : 'income'
    if (symbol) {
      const stock = findCurrency(currencies, symbol)
      if (typeof stock === 'undefined') return { line, description, outcome: 'blocked', symbol }

      const quantityText = cell(quantityIndex)
      const quantity = quantityText ? parseMinorUnits(quantityText, mapping.decimalSeparator, stock.decimalPoints) : 0
      if (quantity === null) return unparseable(`Quantity "${quantityText}" is more precise than ${stock.name} allows`)

      security = { currencyId: stock.id, quantity: Math.abs(quantity) }
      if (quantity === 0) kind = signed < 0 ? 'fee' : 'dividend'
      else kind = signed < 0 ? 'buy' : 'sell'
    }

    return {
      line,
      description,
      outcome: 'parsed',
      row: {
        date,
        description,
        statementName: normalizeStatementName(description),
        kind,
        cash: Math.abs(signed),
        currencyId: currency.id,
        security,
      },
    }
  })
}
