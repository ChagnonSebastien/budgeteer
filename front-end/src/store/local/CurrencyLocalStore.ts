import { BudgeteerDB } from './IndexedDB'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../domain/model/currency'
import { IdIdentifier } from '../../domain/model/Unique'

export default class CurrencyLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Currency[]> {
    const currencies = await this.db.currencies.toCollection().toArray()
    return currencies.map(
      (currency) =>
        new Currency(
          currency.id,
          currency.name,
          currency.symbol,
          currency.risk,
          currency.type,
          currency.decimalPoints,
          new RateAutoupdateSettings(currency.rateFetchScript, currency.autoUpdate),
        ),
    )
  }

  public async create(data: CurrencyUpdatableFields): Promise<Currency> {
    const newID = await this.db.currencies.put({
      rateFetchScript: data.rateAutoupdateSettings.script,
      autoUpdate: data.rateAutoupdateSettings.enabled,
      symbol: data.symbol,
      name: data.name,
      risk: data.risk,
      type: data.type,
      decimalPoints: data.decimalPoints,
    })

    const rateAutoupdateSettings = new RateAutoupdateSettings(
      data.rateAutoupdateSettings.script,
      data.rateAutoupdateSettings.enabled,
    )

    return new Currency(newID, data.name, data.symbol, data.risk, data.type, data.decimalPoints, rateAutoupdateSettings)
  }

  public async createKnown(data: Currency): Promise<void> {
    await this.db.currencies.put({
      id: data.id,
      rateFetchScript: data.rateAutoupdateSettings.script,
      autoUpdate: data.rateAutoupdateSettings.enabled,
      symbol: data.symbol,
      name: data.name,
      risk: data.risk,
      type: data.type,
      decimalPoints: data.decimalPoints,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<CurrencyUpdatableFields>): Promise<void> {
    await this.db.currencies.update(identity.id, {
      rateFetchScript: data.rateAutoupdateSettings?.script,
      autoUpdate: data.rateAutoupdateSettings?.enabled,
      symbol: data.symbol,
      name: data.name,
      risk: data.risk,
      type: data.type,
      decimalPoints: data.decimalPoints,
    })
  }

  public async sync(currencies: Currency[]): Promise<void> {
    await this.db.currencies.clear()
    await this.db.currencies.bulkPut(
      currencies.map((currency) => ({
        id: currency.id,
        rateFetchScript: currency.rateAutoupdateSettings.script,
        autoUpdate: currency.rateAutoupdateSettings.enabled,
        symbol: currency.symbol,
        name: currency.name,
        risk: currency.risk,
        type: currency.type,
        decimalPoints: currency.decimalPoints,
      })),
    )
  }
}
