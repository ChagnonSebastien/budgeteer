import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Category, { AugmentedCategory } from '../domain/model/category'

export interface CategoryPersistenceAugmentation {
  readonly root: Category
  readonly subCategories: { [parent: number]: Category[] }
  readonly augmentedCategories: AugmentedCategory[]
}

export const CategoryPersistenceAugmenter: FC<AugmenterProps<Category, CategoryPersistenceAugmentation>> = (props) => {
  const { augment, state: categories } = props

  const root = useMemo(() => categories.find((c) => c.parentId === null)!, [categories])

  const subCategories = useMemo(() => {
    return (
      categories?.reduce<{ [parent: number]: Category[] }>((tree, c) => {
        if (c.parentId === null) return tree
        return {
          ...tree,
          [c.parentId]: [...(tree[c.parentId] ?? []), c],
        }
      }, {}) ?? {}
    )
  }, [categories])

  const augmentedCategories = useMemo<AugmentedCategory[]>(() => {
    const augmentChildren = (raw: Category, parentCategory: Category | undefined): AugmentedCategory[] => {
      const augmented: AugmentedCategory = { ...raw, parent: parentCategory }
      const augmentedChildren = (subCategories[raw.id] ?? [])
        .map((c) => augmentChildren(c, augmented))
        .reduce((a, b) => [...a, ...b], [])
      return [augmented, ...augmentedChildren]
    }

    return augmentChildren(root, undefined)
  }, [categories, subCategories, root])

  return augment({ root, subCategories, augmentedCategories })
}
