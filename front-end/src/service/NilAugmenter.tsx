import Unique from "../domain/model/Unique"
import { AugmenterProps } from "./BasicCrudServiceWithPersistence"

export function NilPersistenceAugmenter<T extends Unique>({augment}: AugmenterProps<T, {}>) {
  return augment({})
}
