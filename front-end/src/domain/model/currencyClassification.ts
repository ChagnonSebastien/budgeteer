import Currency from './currency'

export const currencyRisks = ['0. None', '1. Low', '2. Low-Medium', '3. Medium', '4. Medium-High', '5. High'] as const

export type CurrencyRisk = (typeof currencyRisks)[number]

export function isCurrencyRisk(value: string): value is CurrencyRisk {
  return (currencyRisks as readonly string[]).includes(value)
}

export interface CurrencyTypeOption {
  name: string
  group: string
}

export const customTypesGroup = 'Your types'

const proposedCurrencyTypes: Record<string, Record<string, CurrencyRisk>> = {
  'Cash & deposits': {
    Cash: '0. None',
    'Savings account': '0. None',
    'Guaranteed investment certificate (GIC)': '0. None',
    'Term deposit': '0. None',
  },
  'Fixed income': {
    'Government savings bond': '0. None',
    'Treasury bill': '0. None',
    'Government bond': '1. Low',
    'Corporate bond': '2. Low-Medium',
    Annuity: '1. Low',
  },
  'Mutual funds': {
    'Money market fund': '1. Low',
    'Short-term bond fund': '1. Low',
    'Bond fund': '1. Low',
    'High-yield bond fund': '2. Low-Medium',
    'Conservative portfolio': '2. Low-Medium',
    'Balanced portfolio': '2. Low-Medium',
    'Growth portfolio': '2. Low-Medium',
    'Aggressive portfolio': '3. Medium',
    'Equity mutual fund': '3. Medium',
  },
  ETFs: {
    'High-interest savings ETF': '1. Low',
    'Bond ETF': '1. Low',
    'Equity ETF': '3. Medium',
    'Dividend ETF': '3. Medium',
    'Covered call ETF': '3. Medium',
    'International equity ETF': '3. Medium',
    'Gold ETF': '3. Medium',
    'Emerging markets ETF': '3. Medium',
    'Sector ETF': '4. Medium-High',
    'Small-cap ETF': '4. Medium-High',
    'Commodity ETF': '4. Medium-High',
    'Leveraged ETF': '5. High',
    'Inverse ETF': '5. High',
  },
  'Stocks & derivatives': {
    'Individual stock': '5. High',
    'Stock portfolio': '5. High',
    Options: '5. High',
  },
  'Real assets': {
    'Precious metals': '3. Medium',
    'Real estate investment trust (REIT)': '3. Medium',
    'Real estate': '3. Medium',
    Collectibles: '5. High',
  },
  'Private & alternative': {
    'Private credit': '2. Low-Medium',
    'Private equity': '4. Medium-High',
    'Hedge fund': '4. Medium-High',
    'Venture capital': '5. High',
  },
  Crypto: {
    Stablecoin: '2. Low-Medium',
    Cryptocurrency: '5. High',
  },
}

const proposedTypes = Object.entries(proposedCurrencyTypes).flatMap(([group, types]) =>
  Object.entries(types).map(([name, risk]) => ({ name, group, risk })),
)

export function currencyTypeOptions(currencies: Currency[]): CurrencyTypeOption[] {
  const known = new Set(proposedTypes.map((t) => t.name.toLowerCase()))
  const custom = new Map<string, CurrencyTypeOption>()
  for (const c of currencies) {
    const name = c.type.trim()
    if (name !== '' && !known.has(name.toLowerCase())) custom.set(name.toLowerCase(), { name, group: customTypesGroup })
  }

  return [...[...custom.values()].sort((a, b) => a.name.localeCompare(b.name)), ...proposedTypes]
}

export function suggestedRiskForType(type: string, currencies: Currency[]): CurrencyRisk | null {
  const normalized = type.trim().toLowerCase()
  if (normalized === '') return null

  const learned = currencies.find((c) => c.type.trim().toLowerCase() === normalized && isCurrencyRisk(c.risk))
  if (typeof learned !== 'undefined') return learned.risk as CurrencyRisk

  return proposedTypes.find((t) => t.name.toLowerCase() === normalized)?.risk ?? null
}
