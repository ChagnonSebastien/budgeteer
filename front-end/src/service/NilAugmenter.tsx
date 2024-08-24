import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Unique from '../domain/model/Unique'

export function NilPersistenceAugmenter<T extends Unique>({ augment }: AugmenterProps<T, unknown>) {
  return augment({})
}
