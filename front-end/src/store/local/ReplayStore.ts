import { Action, ActionType, BudgeteerDB } from './IndexedDB'

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
      time: Date.now(),
    })
  }

  public async replayEvents(): Promise<IterableIterator<Action>> {
    const items = await this.db.replay.orderBy('time').toArray()
    return items[Symbol.iterator]()
  }

  public async clear(): Promise<void> {
    await this.db.replay.clear()
  }
}
