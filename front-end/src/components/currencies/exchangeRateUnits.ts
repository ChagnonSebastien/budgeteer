import Currency from '../../domain/model/currency'

export const validRate = new RegExp(`^\\d*[.,]?\\d*$`)

export const parseRate = (text: string): number | null => {
  if (!validRate.test(text)) return null
  const rate = parseFloat(text.replaceAll(',', '.'))
  if (isNaN(rate) || rate <= 0) return null
  return rate
}

// Stored rates convert between amounts in minor units, so they carry the decimal points difference.
const minorUnitsFactor = (currency: Currency, against: Currency) =>
  Math.pow(10, against.decimalPoints - currency.decimalPoints)

export const toStoredRate = (displayed: number, currency: Currency, against: Currency) =>
  displayed * minorUnitsFactor(currency, against)

export const toDisplayedRate = (stored: number, currency: Currency, against: Currency) =>
  stored / minorUnitsFactor(currency, against)
