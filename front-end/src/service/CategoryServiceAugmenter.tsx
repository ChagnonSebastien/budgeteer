import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Category from '../domain/model/category'

export interface CategoryPersistenceAugmentation {
  readonly root: Category
  readonly subCategories: { [parent: number]: Category[] }
}

export const CategoryPersistenceAugmenter: FC<AugmenterProps<Category, CategoryPersistenceAugmentation>> = (props) => {
  const { augment, state } = props

  const root = useMemo(() => state.find((c) => c.parentId === null)!, [state])

  const subCategories = useMemo(() => {
    return (
      state?.reduce<{ [parent: number]: Category[] }>((tree, c) => {
        if (c.parentId === null) return tree
        return {
          ...tree,
          [c.parentId]: [...(tree[c.parentId] ?? []), c],
        }
      }, {}) ?? {}
    )
  }, [state])

  return augment({ root, subCategories })
}
