import { normalizeAccountName, normalizeStatementName } from './matching'
import { CsvTable, DateOrder, DecimalSeparator, Encoding, parseDate, parseMinorUnits } from './parsing'
import { foldText, sameForSearch } from '../../utils'
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
  priceColumn: string | null
  accountColumn?: string | null
  unitValueAmounts?: boolean
}

const dateOrders: DateOrder[] = ['ymd', 'dmy', 'mdy']

const detectDateOrder = (values: string[]): DateOrder => {
  const filled = values.filter((value) => value.trim() !== '')
  return dateOrders.find((order) => filled.every((value) => parseDate(value, order) !== null)) ?? 'ymd'
}

const signOf = (text: string): number => {
  const trimmed = text.trim()
  if (!/[1-9]/.test(trimmed)) return 0
  return /^\(|^-|-$/.test(trimmed) ? -1 : 1
}

const detectUnitValueAmounts = (table: CsvTable, quantityColumn: string, amountColumn: string): boolean => {
  const quantityIndex = table.headers.indexOf(quantityColumn)
  const amountIndex = table.headers.indexOf(amountColumn)
  if (quantityIndex < 0 || amountIndex < 0) return false
  const moves = table.rows
    .map((row) => [signOf(row[quantityIndex] ?? ''), signOf(row[amountIndex] ?? '')])
    .filter(([units, cash]) => units !== 0 && cash !== 0)
  return moves.length > 0 && moves.every(([units, cash]) => units === cash)
}

export const defaultMapping = (table: CsvTable, defaultCurrency: CurrencyID, multiAccount: boolean): ImportMapping => {
  const { headers } = table
  const find = (...patterns: RegExp[]) => headers.find((h) => patterns.some((p) => p.test(h))) ?? ''
  const debit = find(/debit|retrait|withdraw/i)
  const credit = find(/credit|dép[oô]t|deposit/i)
  const dateColumn = find(/date/i) || (headers[0] ?? '')
  const dateIndex = headers.indexOf(dateColumn)
  const amountColumn = find(/amount|montant/i)
  const quantityColumn = find(/^unit[eé]s$|^units$|quantit|^shares$/i)
  const split = debit !== '' && credit !== '' && debit !== credit
  return {
    encoding: 'utf-8',
    skipLines: 0,
    hasHeader: true,
    dateColumn,
    dateOrder: detectDateOrder(table.rows.map((row) => row[dateIndex] ?? '')),
    amount: split ? { kind: 'split', debit, credit } : { kind: 'signed', column: amountColumn },
    decimalSeparator: '.',
    invertSign: false,
    descriptionColumn: find(/desc|libell|payee|merchant|marchand|name/i) || find(/^transactions?$/i),
    currencyColumn: null,
    defaultCurrency,
    symbolColumn: find(/symbol|ticker|^titres?$|^fonds?$|security|^fund$/i) || null,
    quantityColumn: quantityColumn || null,
    priceColumn: find(/prix unitaire|unit price|^prix$|^price$/i) || null,
    accountColumn: multiAccount
      ? find(/^(compte|account)$/i, /account n|n[o°].{0,4}compte|num[eé]ro de compte/i) || null
      : null,
    unitValueAmounts: !split && detectUnitValueAmounts(table, quantityColumn, amountColumn),
  }
}

export const accountNamesOf = (table: CsvTable, mapping: ImportMapping): string[] => {
  const index = mapping.accountColumn ? table.headers.indexOf(mapping.accountColumn) : -1
  return table.rows.map((row) => (index >= 0 ? normalizeAccountName(row[index] ?? '') : ''))
}

export type RowKind =
  | 'expense'
  | 'income'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'fee'
  | 'conversion'
  | 'stockDividend'
  | 'unitsIn'
  | 'unitsOut'

export const outflowKinds: RowKind[] = ['expense', 'fee', 'unitsOut']

export interface Holding {
  currencyId: CurrencyID
  quantity: number
}

export interface ParsedRow {
  date: Date
  description: string
  statementName: string
  kind: RowKind
  cash: number
  currencyId: CurrencyID
  security: Holding | null
}

export type RowParse =
  | { line: number; description: string; outcome: 'parsed'; row: ParsedRow }
  | { line: number; description: string; outcome: 'unparseable'; reason: string }
  | { line: number; description: string; outcome: 'blocked'; symbol: string }
  | { line: number; description: string; outcome: 'combined'; into: number }

interface Units {
  symbol: string
  quantity: string
}

const valuedAt = /valued at \$?\s*([\d.,]+)/i
const reinvestedIncome = /distribution|dividend|reinvest|interet|interest/

const nameWords = (text: string): string[] =>
  foldText(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '')
    .map((word) => (word.length > 3 ? word.replace(/s$/, '') : word))

const sameName = (a: string[], b: string[]) => a.length === b.length && a.every((word, i) => word === b[i])

const findCurrency = (currencies: Currency[], value: string): Currency | undefined => {
  const exact =
    currencies.find((c) => sameForSearch(c.name, value)) ?? currencies.find((c) => sameForSearch(c.symbol, value))
  if (exact) return exact
  const words = nameWords(value)
  const loose = currencies.filter((c) => sameName(nameWords(c.name), words))
  return loose.length === 1 ? loose[0] : undefined
}

export const parseRows = (
  table: CsvTable,
  mapping: ImportMapping,
  currencies: Currency[],
  groupOf: (row: number) => unknown = () => null,
): RowParse[] => {
  const column = (name: string | null) => (name ? table.headers.indexOf(name) : -1)
  const dateIndex = column(mapping.dateColumn)
  const descriptionIndex = column(mapping.descriptionColumn)
  const currencyIndex = column(mapping.currencyColumn)
  const symbolIndex = column(mapping.symbolColumn)
  const quantityIndex = column(mapping.quantityColumn)
  const priceIndex = column(mapping.priceColumn)
  const signedIndex = mapping.amount.kind === 'signed' ? column(mapping.amount.column) : -1
  const debitIndex = mapping.amount.kind === 'split' ? column(mapping.amount.debit) : -1
  const creditIndex = mapping.amount.kind === 'split' ? column(mapping.amount.credit) : -1
  const cashIndexes = mapping.amount.kind === 'signed' ? [signedIndex] : [debitIndex, creditIndex]
  const defaultCurrency = currencies.find((c) => c.id === mapping.defaultCurrency)

  const lineOf = (i: number) => i + 1 + mapping.skipLines + (mapping.hasHeader ? 1 : 0)
  const cellOf = (i: number, index: number) => (index >= 0 ? (table.rows[i][index] ?? '').trim() : '')
  const thousandsSeparator = mapping.decimalSeparator === '.' ? ',' : '.'
  const numeric = (text: string) => {
    const value = Number(
      text
        .split(thousandsSeparator)
        .join('')
        .replace(',', '.')
        .replace(/[^\d.-]/g, ''),
    )
    return Number.isFinite(value) ? value : 0
  }

  const unitsOnly = table.rows.map((_, i): Units | null => {
    const symbol = cellOf(i, symbolIndex)
    const quantity = cellOf(i, quantityIndex)
    if (cashIndexes.some((index) => numeric(cellOf(i, index)) !== 0)) return null
    return symbol && numeric(quantity) !== 0 ? { symbol, quantity } : null
  })

  // Placeholder-series buys (priced later by a cashless swap) take the swapped-in units, so their cash prices them.
  const conversions = new Map<number, { out: Units; in: Units }>()
  const combinedInto = new Map<number, number>()
  const swappedIn = new Map<number, Units>()
  for (let i = 0; i + 1 < table.rows.length; i += 1) {
    const [a, b] = [unitsOnly[i], unitsOnly[i + 1]]
    if (a === null || b === null || combinedInto.has(i)) continue
    if (cellOf(i, dateIndex) !== cellOf(i + 1, dateIndex) || a.symbol === b.symbol) continue
    if (groupOf(i) !== groupOf(i + 1)) continue
    if (numeric(a.quantity) > 0 === numeric(b.quantity) > 0) continue
    const [out, received] = numeric(a.quantity) < 0 ? [a, b] : [b, a]

    const placeholderBuy = table.rows.findIndex(
      (_, j) =>
        unitsOnly[j] === null &&
        !swappedIn.has(j) &&
        groupOf(j) === groupOf(i) &&
        cellOf(j, symbolIndex) === out.symbol &&
        Math.abs(numeric(cellOf(j, quantityIndex))) === Math.abs(numeric(out.quantity)),
    )
    if (placeholderBuy >= 0) {
      swappedIn.set(placeholderBuy, received)
      combinedInto.set(i, lineOf(placeholderBuy))
      combinedInto.set(i + 1, lineOf(placeholderBuy))
    } else {
      conversions.set(i, { out, in: received })
      combinedInto.set(i + 1, lineOf(i))
    }
  }

  // Fund accounts hold no cash: the amount is the value of the units moved, so a switch is a units-out/units-in pair.
  const unitValue = mapping.unitValueAmounts === true && mapping.amount.kind === 'signed'
  const unitsMoved = (i: number): Units | null => {
    const symbol = cellOf(i, symbolIndex)
    const quantity = cellOf(i, quantityIndex)
    return symbol && numeric(quantity) !== 0 ? { symbol, quantity } : null
  }
  const paired = (i: number) => combinedInto.has(i) || conversions.has(i)
  if (unitValue) {
    for (let i = 0; i < table.rows.length; i += 1) {
      const out = unitsMoved(i)
      if (out === null || numeric(out.quantity) > 0 || paired(i)) continue
      const value = Math.abs(numeric(cellOf(i, signedIndex)))
      let best = -1
      for (let j = 0; j < table.rows.length; j += 1) {
        const received = unitsMoved(j)
        if (received === null || numeric(received.quantity) < 0 || received.symbol === out.symbol || paired(j)) continue
        if (cellOf(i, dateIndex) !== cellOf(j, dateIndex) || groupOf(i) !== groupOf(j)) continue
        if (Math.abs(numeric(cellOf(j, signedIndex))) !== value) continue
        if (best < 0 || Math.abs(j - i) < Math.abs(best - i)) best = j
      }
      if (best >= 0) {
        conversions.set(i, { out, in: unitsMoved(best)! })
        combinedInto.set(best, lineOf(i))
      }
    }
  }

  return table.rows.map((_, i): RowParse => {
    const line = lineOf(i)
    const cell = (index: number) => cellOf(i, index)
    const description = cell(descriptionIndex)
    const unparseable = (reason: string): RowParse => ({ line, description, outcome: 'unparseable', reason })

    const into = combinedInto.get(i)
    if (typeof into !== 'undefined') return { line, description, outcome: 'combined', into }

    const date = parseDate(cell(dateIndex), mapping.dateOrder)
    if (date === null) return unparseable(`Unreadable date "${cell(dateIndex)}"`)

    const currencyText = cell(currencyIndex)
    const currency = currencyText ? findCurrency(currencies, currencyText) : defaultCurrency
    if (typeof currency === 'undefined') return unparseable(`Unknown currency "${currencyText}"`)

    const parsed = (row: Pick<ParsedRow, 'kind' | 'cash' | 'currencyId' | 'security'>): RowParse => ({
      line,
      description,
      outcome: 'parsed',
      row: { date, description, statementName: normalizeStatementName(description), ...row },
    })

    const holding = (units: Units): { holding: Holding } | { failure: RowParse } => {
      const stock = findCurrency(currencies, units.symbol)
      if (typeof stock === 'undefined')
        return { failure: { line, description, outcome: 'blocked', symbol: units.symbol } }
      const quantity = parseMinorUnits(units.quantity || '0', mapping.decimalSeparator, stock.decimalPoints)
      if (quantity === null)
        return { failure: unparseable(`Quantity "${units.quantity}" is more precise than ${stock.name} allows`) }
      return { holding: { currencyId: stock.id, quantity: Math.abs(quantity) } }
    }

    const conversion = conversions.get(i)
    if (conversion) {
      const out = holding(conversion.out)
      if ('failure' in out) return out.failure
      const received = holding(conversion.in)
      if ('failure' in received) return received.failure
      return parsed({
        kind: 'conversion',
        cash: out.holding.quantity,
        currencyId: out.holding.currencyId,
        security: received.holding,
      })
    }

    const moved = unitsOnly[i]
    if (moved) {
      if (numeric(moved.quantity) < 0) return unparseable('Units left the account without cash or units in return')
      const received = holding(moved)
      if ('failure' in received) return received.failure
      const units = received.holding
      const price = numeric(description.match(valuedAt)?.[1] ?? '')
      if (price === 0)
        return parsed({ kind: 'stockDividend', cash: units.quantity, currencyId: units.currencyId, security: units })

      const stock = currencies.find((c) => c.id === units.currencyId)!
      const value = Math.round((units.quantity / 10 ** stock.decimalPoints) * price * 10 ** currency.decimalPoints)
      return parsed({ kind: 'stockDividend', cash: value, currencyId: currency.id, security: units })
    }

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

    const cash = { cash: Math.abs(signed), currencyId: currency.id }
    const units = swappedIn.get(i) ?? { symbol: cell(symbolIndex), quantity: cell(quantityIndex) }
    if (!units.symbol) return parsed({ kind: signed < 0 ? 'expense' : 'income', ...cash, security: null })

    if (unitValue && !swappedIn.has(i) && numeric(units.quantity) !== 0) {
      const moved = holding(units)
      if ('failure' in moved) return moved.failure
      const kind: RowKind =
        numeric(units.quantity) < 0
          ? 'unitsOut'
          : reinvestedIncome.test(foldText(description))
            ? 'stockDividend'
            : 'unitsIn'
      return parsed({ kind, ...cash, security: moved.holding })
    }

    // distributions put their cash in the quantity column, without a unit price
    const distribution = priceIndex >= 0 && cell(priceIndex) === '' && !swappedIn.has(i)
    const security = holding(distribution ? { ...units, quantity: '' } : units)
    if ('failure' in security) return security.failure
    const traded = security.holding.quantity !== 0
    const kind: RowKind = traded ? (signed < 0 ? 'buy' : 'sell') : signed < 0 ? 'fee' : 'dividend'
    return parsed({ kind, ...cash, security: security.holding })
  })
}
