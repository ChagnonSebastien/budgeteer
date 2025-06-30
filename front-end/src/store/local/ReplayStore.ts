import { BudgeteerDB } from './indexedDb/db'

export type ActionType = 'create' | 'update' | 'delete'

export default class ReplayStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async saveAction(
    itemType: string,
    actionType: ActionType,
    identifier?: unknown,
    data?: unknown,
  ): Promise<void> {
    await this.db.replay.add({
      itemType: itemType,
      actionType: actionType,
      identity: identifier,
      data: data,
    })
  }
}
