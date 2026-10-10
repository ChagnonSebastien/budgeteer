import { foldText } from '../../utils'
import Account, { AccountID } from '../model/account'

const processorPrefix = /^(sq|paypal|tst)\s*\*\s*/
const regionCodes = new Set([
  'ab',
  'bc',
  'mb',
  'nb',
  'nl',
  'ns',
  'nt',
  'nu',
  'on',
  'pe',
  'qc',
  'sk',
  'yt',
  'ca',
  'can',
  'us',
  'usa',
  'fr',
  'fra',
  'gb',
  'uk',
])
const legalSuffixes = new Set(['inc', 'ltd', 'lte', 'ltee', 'enr', 'corp'])

const statementTokens = (text: string): string[] =>
  foldText(text.trim())
    .replace(processorPrefix, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(
      (token, index) =>
        token !== '' && !/\d/.test(token) && !legalSuffixes.has(token) && (index === 0 || !regionCodes.has(token)),
    )

export const normalizeStatementName = (description: string): string => statementTokens(description).join(' ')

const jaroWinkler = (a: string, b: string): number => {
  if (a === b) return 1
  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1)
  const aMatched = new Array<boolean>(a.length).fill(false)
  const bMatched = new Array<boolean>(b.length).fill(false)

  let matches = 0
  for (let i = 0; i < a.length; i += 1) {
    for (let j = Math.max(0, i - window); j < Math.min(b.length, i + window + 1); j += 1) {
      if (bMatched[j] || a[i] !== b[j]) continue
      aMatched[i] = true
      bMatched[j] = true
      matches += 1
      break
    }
  }
  if (matches === 0) return 0

  let transpositions = 0
  for (let i = 0, j = 0; i < a.length; i += 1) {
    if (!aMatched[i]) continue
    while (!bMatched[j]) j += 1
    if (a[i] !== b[j]) transpositions += 1
    j += 1
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3
  let prefix = 0
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1
  return jaro + prefix * 0.1 * (1 - jaro)
}

const tokensMatch = (a: string, b: string): boolean => {
  if (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  return a.length >= 5 && b.length >= 5 && jaroWinkler(a, b) >= 0.92
}

export type MatchSource = 'exact' | 'fuzzy'

export interface AccountMatch {
  accountId: AccountID
  source: MatchSource
}

const single = <T>(items: T[]): T | null => (items.length === 1 ? items[0] : null)

export const exactStatementMatch = (statementName: string, accounts: Account[]): AccountID | null =>
  statementName === '' ? null : (single(accounts.filter((a) => a.statementNames.includes(statementName)))?.id ?? null)

export interface PreparedPayee {
  account: Account
  tokens: string[]
}

export const preparePayees = (payees: Account[]): PreparedPayee[] =>
  payees.map((account) => ({ account, tokens: statementTokens(account.name) }))

export const matchPayee = (statementName: string, payees: PreparedPayee[]): AccountMatch | null => {
  const exact = exactStatementMatch(
    statementName,
    payees.map((p) => p.account),
  )
  if (exact !== null) return { accountId: exact, source: 'exact' }

  const description = statementName.split(' ').filter((token) => token !== '')
  if (description.length === 0) return null

  const candidates = payees.filter(
    ({ tokens }) =>
      tokens.length > 0 &&
      tokens.every((token) => description.some((other) => tokensMatch(token, other))) &&
      tokens.some((token) => tokensMatch(token, description[0])),
  )
  const match = single(candidates)
  return match === null ? null : { accountId: match.account.id, source: 'fuzzy' }
}
