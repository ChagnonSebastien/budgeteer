import Unique from './Unique'

export class ExchangeRate implements Unique {
  constructor(
    public readonly id: number,
    public readonly rate: number,
    public readonly date: string,
  ) {}
}

export default class Currency implements Unique {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly decimalPoints: number,
    public readonly exchangeRates: { [comparedTo: number]: ExchangeRate[] },
  ) {}
}

export function formatFull(currency: Currency, rawValue: number): string {
  const formatted = `${Math.abs(formatAmount(currency, rawValue))} ${currency.symbol}`

  if (rawValue < 0) {
    return `(${formatted})`
  }
  return formatted
}

export function formatAmount(currency: Currency, rawValue: number): number {
  return rawValue / Math.pow(10, currency.decimalPoints)
}

export function parseAmount(currency: Currency, rawValue: string): number {
  return parseFloat(rawValue) * Math.pow(10, currency.decimalPoints)
}
