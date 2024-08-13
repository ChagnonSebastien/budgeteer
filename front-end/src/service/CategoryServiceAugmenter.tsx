import { FC, useMemo } from "react"
import Category from "../domain/model/category"
import { AugmenterProps } from "./BasicCrudServiceWithPersistence"

export interface CategoryPersistenceAugmentation {
  readonly root: Category
}

export const CategoryPersistenceAugmenter: FC<AugmenterProps<Category, CategoryPersistenceAugmentation>> = (props) => {
  const {augment, state} = props

  const root = useMemo(() => state.find(c => c.parentId === null)!, [state])

  return augment({root})
}