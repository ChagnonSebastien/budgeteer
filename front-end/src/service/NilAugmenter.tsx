import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Unique from '../domain/model/Unique'

export function NilPersistenceAugmenter<IdType, T extends Unique<IdType>>({
  augment,
}: AugmenterProps<IdType, T, unknown>) {
  return augment({})
}
