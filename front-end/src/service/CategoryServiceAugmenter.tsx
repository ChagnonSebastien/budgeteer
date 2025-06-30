import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import Category, { AugmentedCategory, CategoryID } from '../domain/model/category'

export interface CategoryPersistenceAugmentation {
  readonly tentativeRoot: Category | null
  readonly subCategories: { [parent: CategoryID]: Category[] }
  readonly augmentedCategories: AugmentedCategory[]
  readonly augmentedVersion: number
}

export const CategoryPersistenceAugmenter: FC<AugmenterProps<CategoryID, Category, CategoryPersistenceAugmentation>> = (
  props,
) => {
  const { augment, state: categories, version } = props

  const augmentedData = useMemo<CategoryPersistenceAugmentation>(() => {
    const root = categories.find((c) => c.parentId === null) ?? null

    const subCategories =
      categories?.reduce<{ [parent: CategoryID]: Category[] }>((tree, c) => {
        if (c.parentId === null) return tree
        return {
          ...tree,
          [c.parentId]: [...(tree[c.parentId] ?? []), c],
        }
      }, {}) ?? {}

    if (!root) return { tentativeRoot: root, subCategories, augmentedCategories: [], augmentedVersion: -1 }
    const augmentChildren = (raw: Category, parentCategory: Category | undefined): AugmentedCategory[] => {
      const augmented = new AugmentedCategory(raw, parentCategory)
      const augmentedChildren = (subCategories[raw.id] ?? [])
        .map((c) => augmentChildren(c, augmented))
        .reduce((a, b) => [...a, ...b], [])
      return [augmented, ...augmentedChildren]
    }

    const augmentedCategories = augmentChildren(root, undefined)

    return { tentativeRoot: root, subCategories, augmentedCategories, augmentedVersion: version }
  }, [categories, version])

  return augment(augmentedData)
}
