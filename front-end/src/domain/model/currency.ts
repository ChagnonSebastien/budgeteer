import NamedItem from './NamedItem'

export class RateAutoupdateSettings {
  constructor(
    public readonly script: string,
    public readonly enabled: boolean,
  ) {}
}

export type CurrencyID = number

export default class Currency implements NamedItem<CurrencyID> {
  constructor(
    public readonly id: CurrencyID,
    public readonly name: string,
    public readonly symbol: string,
    public readonly decimalPoints: number,
    public readonly rateAutoupdateSettings: RateAutoupdateSettings,
  ) {}

  hasName(name: string): boolean {
    return this.name.toLowerCase() === name.toLowerCase()
  }
}

export function formatFull(currency: Currency, rawValue: number, anonymity = false): string {
  const formatted = `${formatAmount(currency, rawValue, anonymity)} ${currency.symbol}`

  if (rawValue < 0) {
    return `(${formatted})`
  }
  return formatted
}

export function formatAmount(currency: Currency, rawValue: number, anonymity = false): string {
  if (anonymity) {
    return 'XX.' + 'X'.repeat(currency.decimalPoints)
  }

  return Math.abs(rawValue / Math.pow(10, currency.decimalPoints)).toLocaleString(undefined, {
    minimumFractionDigits: currency.decimalPoints,
    maximumFractionDigits: currency.decimalPoints,
  })
}

export function parseAmount(currency: Currency, rawValue: string): number {
  return Math.round(parseFloat(rawValue) * Math.pow(10, currency.decimalPoints))
}

export type CurrencyUpdatableFields = Pick<Currency, 'symbol' | 'name' | 'rateAutoupdateSettings' | 'decimalPoints'>
