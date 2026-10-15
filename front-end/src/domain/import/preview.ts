import { outflowKinds, ParsedRow, RowParse } from './mapping'
import { exactStatementMatch, MatchSource, matchPayee, preparePayees } from './matching'
import { formatYmd, sha256Hex } from './parsing'
import Account, { AccountID } from '../model/account'
import { CategoryID } from '../model/category'
import Transaction, {
  FinancialIncomeData,
  latestCategoryWith,
  TransactionID,
  TransactionUpdatableFields,
} from '../model/transaction'

const matchWindowMs = 3 * 24 * 60 * 60 * 1000

export type RowStatus =
  | 'new'
  | 'imported'
  | 'duplicate'
  | 'transferMatch'
  | 'transferSuggestion'
  | 'unparseable'
  | 'blocked'
  | 'combined'

export interface Counterparty {
  id: AccountID | null
  name: string
}

export interface TransferOption {
  accountId: AccountID
  mergeInto: TransactionID | null
  stored: Transaction | null
}

export interface PreviewRow {
  key: number
  parse: RowParse
  fingerprint: string
  status: RowStatus
  payee: Counterparty
  payeeSource: MatchSource | null
  transfer: TransferOption | null
}

export interface RowChoice {
  included: boolean
  counterparty: Counterparty
  mergeInto: TransactionID | null
  categoryId: CategoryID | null | 'auto'
  note: string | null
}

export const computeFingerprints = async (account: AccountID, parses: RowParse[]): Promise<string[]> => {
  const occurrences = new Map<string, number>()
  return Promise.all(
    parses.map((parse) => {
      if (parse.outcome !== 'parsed') return ''
      const { date, kind, cash, currencyId, description, security } = parse.row
      const key = [
        account,
        formatYmd(date),
        kind,
        cash,
        currencyId,
        description,
        security?.currencyId ?? '',
        security?.quantity ?? '',
      ].join('|')
      const occurrence = occurrences.get(key) ?? 0
      occurrences.set(key, occurrence + 1)
      return sha256Hex(`${key}|${occurrence}`)
    }),
  )
}

const isOutflow = (row: ParsedRow) => outflowKinds.includes(row.kind)

export const isTrade = (row: ParsedRow) => row.kind === 'buy' || row.kind === 'sell' || row.kind === 'conversion'

const movesCash = (row: ParsedRow) => !isTrade(row) && row.kind !== 'stockDividend'

const sideOf = (transaction: Transaction, account: AccountID, outflow: boolean) =>
  outflow
    ? transaction.senderId === account
      ? { amount: transaction.amount, currency: transaction.currencyId }
      : null
    : transaction.receiverId === account
      ? { amount: transaction.receiverAmount, currency: transaction.receiverCurrencyId }
      : null

const pairClosest = <Candidate>(
  rows: { key: number; date: Date }[],
  candidatesOf: (key: number) => { candidate: Candidate; id: TransactionID; date: Date }[],
  taken: Set<TransactionID>,
): Map<number, Candidate> => {
  const pairs = rows.flatMap((row) =>
    candidatesOf(row.key).map((c) => ({ key: row.key, ...c, gap: Math.abs(c.date.getTime() - row.date.getTime()) })),
  )
  pairs.sort((a, b) => a.gap - b.gap)

  const result = new Map<number, Candidate>()
  for (const pair of pairs) {
    if (result.has(pair.key) || taken.has(pair.id)) continue
    result.set(pair.key, pair.candidate)
    taken.add(pair.id)
  }
  return result
}

const withinWindow = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) <= matchWindowMs

export const buildPreview = (
  account: Account,
  parses: RowParse[],
  fingerprints: string[],
  known: Map<string, TransactionID>,
  accounts: Account[],
  transactions: Transaction[],
): PreviewRow[] => {
  const mine = new Set(accounts.filter((a) => a.isMine).map((a) => a.id))
  const payees = preparePayees(accounts.filter((a) => !a.isMine))
  const otherOwnAccounts = accounts.filter((a) => a.isMine && a.id !== account.id)
  const taken = new Set<TransactionID>(known.values())

  const rows: PreviewRow[] = parses.map((parse, key) => {
    const base = {
      key,
      parse,
      fingerprint: fingerprints[key] ?? '',
      payee: { id: null, name: '' },
      payeeSource: null,
      transfer: null,
    }
    if (parse.outcome !== 'parsed') return { ...base, status: parse.outcome }
    if (known.has(base.fingerprint)) return { ...base, status: 'imported' }

    const match = isTrade(parse.row) ? null : matchPayee(parse.row.statementName, payees)
    const payeeAccount = match ? accounts.find((a) => a.id === match.accountId) : undefined
    return {
      ...base,
      status: 'new',
      payee: payeeAccount ? { id: payeeAccount.id, name: payeeAccount.name } : base.payee,
      payeeSource: match?.source ?? null,
    }
  })

  const open = () =>
    rows.filter(
      (r): r is PreviewRow & { parse: { outcome: 'parsed'; row: ParsedRow } } =>
        r.status === 'new' && r.parse.outcome === 'parsed' && movesCash(r.parse.row),
    )
  const parsedOf = (key: number) => (rows[key].parse as { row: ParsedRow }).row

  const duplicates = pairClosest(
    open().map((r) => ({ key: r.key, date: r.parse.row.date })),
    (key) => {
      const row = parsedOf(key)
      return transactions
        .filter((t) => {
          if (t.senderId !== null && t.senderId === t.receiverId) return false
          const side = sideOf(t, account.id, isOutflow(row))
          return (
            side !== null &&
            side.amount === row.cash &&
            side.currency === row.currencyId &&
            withinWindow(t.date, row.date)
          )
        })
        .map((t) => ({ candidate: t, id: t.id, date: t.date }))
    },
    taken,
  )
  for (const [key, stored] of duplicates) {
    const counterpart = isOutflow(parsedOf(key)) ? stored.receiverId : stored.senderId
    const isTransfer = stored.categoryId === null && counterpart !== null && mine.has(counterpart)
    rows[key].status = isTransfer ? 'imported' : 'duplicate'
  }

  const mergeable = transactions.filter(
    (t) =>
      t.categoryId !== null &&
      t.financialIncomeData === null &&
      t.transactionGroupData === null &&
      t.senderId !== account.id &&
      t.receiverId !== account.id,
  )
  const transferCandidates = (key: number, sameCurrency: boolean) => {
    const row = parsedOf(key)
    if (row.kind !== 'expense' && row.kind !== 'income') return []
    return mergeable
      .filter((t) => {
        if (!withinWindow(t.date, row.date)) return false
        const own = isOutflow(row) ? t.receiverId : t.senderId
        const other = isOutflow(row) ? t.senderId : t.receiverId
        if (own === null || !mine.has(own) || (other !== null && mine.has(other))) return false
        const side = isOutflow(row)
          ? { amount: t.receiverAmount, currency: t.receiverCurrencyId }
          : { amount: t.amount, currency: t.currencyId }
        return sameCurrency
          ? side.currency === row.currencyId && side.amount === row.cash
          : side.currency !== row.currencyId
      })
      .map((t) => ({
        candidate: { accountId: (isOutflow(row) ? t.receiverId : t.senderId)!, mergeInto: t.id, stored: t },
        id: t.id,
        date: t.date,
      }))
  }

  for (const sameCurrency of [true, false]) {
    const matched = pairClosest(
      open().map((r) => ({ key: r.key, date: r.parse.row.date })),
      (key) => transferCandidates(key, sameCurrency),
      taken,
    )
    for (const [key, option] of matched) {
      rows[key].status = 'transferMatch'
      rows[key].transfer = option
    }
  }

  for (const row of open()) {
    if (row.parse.row.kind !== 'expense' && row.parse.row.kind !== 'income') continue
    const accountId = exactStatementMatch(row.parse.row.statementName, otherOwnAccounts)
    if (accountId === null) continue
    row.status = 'transferSuggestion'
    row.transfer = { accountId, mergeInto: null, stored: null }
  }

  return rows
}

export const isImportable = (row: PreviewRow) =>
  row.status !== 'unparseable' && row.status !== 'blocked' && row.status !== 'imported' && row.status !== 'combined'

export const initialChoice = (row: PreviewRow, accounts: Account[]): RowChoice => {
  const importable = isImportable(row)
  const autoMerge =
    row.status === 'transferMatch' &&
    row.transfer?.stored !== null &&
    row.parse.outcome === 'parsed' &&
    (isOutflow(row.parse.row) ? row.transfer!.stored!.receiverCurrencyId : row.transfer!.stored!.currencyId) ===
      row.parse.row.currencyId
  if (autoMerge) {
    const account = accounts.find((a) => a.id === row.transfer!.accountId)
    return {
      included: true,
      counterparty: { id: row.transfer!.accountId, name: account?.name ?? '' },
      mergeInto: row.transfer!.mergeInto,
      categoryId: null,
      note: null,
    }
  }
  return {
    included: importable && row.status !== 'duplicate',
    counterparty: row.payee,
    mergeInto: null,
    categoryId: 'auto',
    note: null,
  }
}

export const isTransferChoice = (choice: RowChoice, accounts: Account[]) =>
  choice.counterparty.id !== null && (accounts.find((a) => a.id === choice.counterparty.id)?.isMine ?? false)

export const effectiveCategory = (
  row: ParsedRow,
  choice: RowChoice,
  accounts: Account[],
  transactions: Transaction[],
): CategoryID | null => {
  if (isTrade(row) || isTransferChoice(choice, accounts)) return null
  if (choice.categoryId !== 'auto') return choice.categoryId
  if (choice.counterparty.id === null) return null
  return latestCategoryWith(transactions, choice.counterparty.id, !isOutflow(row))
}

export interface CommitRow {
  transaction: TransactionUpdatableFields
  fingerprint: string
  statementName: string
  mergeInto: TransactionID | null
}

export const toCommitRow = (
  account: AccountID,
  owner: string,
  row: ParsedRow,
  fingerprint: string,
  counterpartyId: AccountID | null,
  categoryId: CategoryID | null,
  mergeInto: TransactionID | null,
  note: string,
): CommitRow => {
  const security = row.security
  const cashSide = { amount: row.cash, currency: row.currencyId }
  const securitySide = security ? { amount: security.quantity, currency: security.currencyId } : cashSide
  const [sender, receiver] = isOutflow(row) ? [account, counterpartyId] : [counterpartyId, account]
  const transfer = { sender: account, receiver: account }

  const shape = (() => {
    switch (row.kind) {
      case 'buy':
        return { ...transfer, from: cashSide, to: securitySide }
      case 'sell':
        return { ...transfer, from: securitySide, to: cashSide }
      case 'conversion':
        return { ...transfer, from: cashSide, to: securitySide }
      case 'stockDividend':
        return { sender, receiver, from: cashSide, to: securitySide }
      default:
        return { sender, receiver, from: cashSide, to: cashSide }
    }
  })()

  return {
    transaction: {
      owner,
      amount: shape.from.amount,
      currencyId: shape.from.currency,
      categoryId,
      date: row.date,
      senderId: shape.sender,
      receiverId: shape.receiver,
      note,
      receiverCurrencyId: shape.to.currency,
      receiverAmount: shape.to.amount,
      financialIncomeData:
        (row.kind === 'dividend' || row.kind === 'fee' || row.kind === 'stockDividend') && security
          ? new FinancialIncomeData(security.currencyId)
          : null,
      transactionGroupData: null,
    },
    fingerprint,
    statementName: counterpartyId !== null ? row.statementName : '',
    mergeInto,
  }
}
