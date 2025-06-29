import Unique from '../domain/model/Unique'

export interface BasicCrudService<IdType, Item extends Unique<IdType>, ItemIdentifiableFields, UpdatableFields> {
  state: Item[]
  create(data: UpdatableFields, identity?: ItemIdentifiableFields): Promise<Item>
  update(identity: ItemIdentifiableFields, data: Partial<UpdatableFields>): Promise<void>
  delete(uid: string): Promise<void>
}
