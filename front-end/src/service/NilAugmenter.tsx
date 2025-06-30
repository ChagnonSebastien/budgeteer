import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Unique from '../domain/model/Unique'

export function NilPersistenceAugmenter<IdType, Item extends Unique<IdType, Item>>({
  augment,
}: AugmenterProps<IdType, Item, unknown>) {
  return augment({})
}
