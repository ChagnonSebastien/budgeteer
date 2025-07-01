import NamedItem from './NamedItem'

export class RateAutoupdateSettings {
  constructor(
    public readonly script: string,
    public readonly enabled: boolean,
  ) {}

  equals(other: RateAutoupdateSettings): boolean {
    if (this.script !== other.script) return false
    return this.enabled === other.enabled
  }
}

export type CurrencyID = number

export default class Currency implements NamedItem<CurrencyID, Currency> {
  constructor(
    public readonly id: CurrencyID,
    public readonly name: string,
    public readonly symbol: string,
    public readonly risk: string,
    public readonly type: string,
    public readonly decimalPoints: number,
    public readonly rateAutoupdateSettings: RateAutoupdateSettings,
  ) {}

  hasName(name: string): boolean {
    return this.name.toLowerCase() === name.toLowerCase()
  }

  equals(other: Currency): boolean {
    if (this.id !== other.id) return false
    if (this.name !== other.name) return false
    if (this.symbol !== other.symbol) return false
    if (this.risk !== other.risk) return false
    if (this.type !== other.type) return false
    if (this.decimalPoints !== other.decimalPoints) return false
    return this.rateAutoupdateSettings.equals(other.rateAutoupdateSettings)
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

export type CurrencyUpdatableFields = Pick<
  Currency,
  'symbol' | 'name' | 'rateAutoupdateSettings' | 'decimalPoints' | 'risk' | 'type'
>
