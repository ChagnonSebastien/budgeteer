import { alpha, Box, CircularProgress } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Fragment, ReactNode, useContext, useMemo, useState } from 'react'

import Category, { CategoryID } from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { ItemListProps, MultiSelectConfiguration, SingleSelectConfiguration } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'

const transient = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') }

const selectionBorderWidth = 3
const expandWidth = 5
const nestedIndent = 3

const CategoryListItem = styled(
  'div',
  transient,
)<{ $isSelected: boolean; $hasSelectedChild: boolean }>(({ theme, $isSelected, $hasSelectedChild }) => {
  const brand = theme.palette.primary.main
  return {
    borderRadius: theme.radius.md,
    transition: 'all 200ms ease-in-out',
    borderLeft: `${selectionBorderWidth}px solid ${$isSelected ? brand : 'transparent'}`,
    margin: theme.spacing(0.25, 0),
    backgroundColor: $isSelected ? alpha(brand, 0.12) : $hasSelectedChild ? alpha(brand, 0.04) : 'transparent',
    '&:hover': {
      backgroundColor: $isSelected
        ? alpha(brand, 0.16)
        : $hasSelectedChild
          ? alpha(brand, 0.08)
          : theme.palette.surface.raised,
    },
  }
})

const ExpandButton = styled(
  'div',
  transient,
)<{ $hasSelectedChild: boolean }>(({ theme }) => ({
  width: theme.spacing(expandWidth),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: theme.palette.text.disabled,
  '&:hover': { color: theme.palette.text.primary },
  '.rotatable': {
    transition: 'all 200ms ease-in-out',
    fontSize: theme.typography.subtitle1.fontSize,
    '&.open': { transform: 'rotate(90deg)' },
  },
}))

const Collapsible = styled(
  'div',
  transient,
)<{ $isOpen: boolean }>(({ $isOpen }) => ({
  maxHeight: $isOpen ? 'none' : 0,
  overflow: $isOpen ? 'visible' : 'hidden',
  transition: 'all 300ms ease-in-out',
  opacity: $isOpen ? 1 : 0,
}))

const NestedCategoryContainer = styled('div')(({ theme }) => ({
  marginLeft: theme.spacing(nestedIndent),
  position: 'relative',
  paddingLeft: theme.spacing(1),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: `calc(${selectionBorderWidth}px + ${theme.spacing(expandWidth / 2)} - ${theme.spacing(nestedIndent)} - 0.5px)`,
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: theme.palette.surface.strong,
    borderRadius: theme.radius.sm,
  },
}))

type Props = ItemListProps<CategoryID, Category, object>

export const CategoryList = (props: Props) => {
  const { items, selectConfiguration, filter, ItemComponent, additionalItemsProps } = props
  const { subCategories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)

  const filteredList = useMemo(() => (filter ? items.filter(filter) : items), [items, filter])

  const isSelected = (id: CategoryID) => {
    if (typeof selectConfiguration === 'undefined') return false

    if (selectConfiguration.mode === 'single') {
      const config = selectConfiguration as SingleSelectConfiguration<CategoryID, Category>
      return config.selectedItem === id
    }

    if (selectConfiguration.mode === 'multi') {
      const config = selectConfiguration as MultiSelectConfiguration<CategoryID, Category>
      return config.selectedItems.findIndex((i) => i === id) >= 0
    }

    return false
  }

  const getAllDescendants = (categoryId: CategoryID): CategoryID[] => {
    const descendants: CategoryID[] = []
    const children = subCategories[categoryId]
    if (!children) return descendants

    children.forEach((child) => {
      descendants.push(child.id)
      descendants.push(...getAllDescendants(child.id))
    })

    return descendants
  }

  const getAllAncestors = (categoryId: number): number[] => {
    const ancestors: number[] = []

    let current = filteredList.find((c) => c.id === categoryId)
    while (current?.parentId && current.parentId !== rootCategory.id) {
      ancestors.push(current.parentId)
      current = filteredList.find((c) => c.id === current?.parentId)
    }

    return ancestors
  }

  const click = (item: Category) => {
    if (typeof selectConfiguration === 'undefined') return false

    if (selectConfiguration.mode === 'click') {
      selectConfiguration.onClick(item)
      return
    }

    if (selectConfiguration.mode === 'single') {
      const config = selectConfiguration as SingleSelectConfiguration<CategoryID, Category>
      config.onSelectItem(item.id)
      return
    }

    if (selectConfiguration.mode === 'multi') {
      if (item.id === rootCategory.id) {
        selectConfiguration.onSelectItems([])
        return
      }

      const config = selectConfiguration as MultiSelectConfiguration<CategoryID, Category>
      if (config.selectedItems.findIndex((i) => i === item.id) >= 0) {
        config.onSelectItems(config.selectedItems.filter((i) => i !== item.id))
      } else {
        const descendants = getAllDescendants(item.id)
        const ancestors = getAllAncestors(item.id)
        const toRemove = new Set([...descendants, ...ancestors])
        config.onSelectItems([...selectConfiguration.selectedItems.filter((id) => !toRemove.has(id)), item.id])
      }
      return
    }
  }

  const [open, setOpen] = useState<CategoryID[]>(() => {
    // Initialize with root and any parent categories of selected items
    const openCategories = [rootCategory.id]

    // Find parent categories of selected items
    if (filteredList) {
      filteredList
        .filter((category) => isSelected(category.id))
        .forEach((selected) => {
          const initialCategory = filteredList.find((c) => c.id === selected.id)
          if (!initialCategory) return

          let category = initialCategory
          while (category.parentId && category.parentId !== rootCategory.id) {
            openCategories.push(category.parentId)
            const parentCategory = filteredList.find((c) => c.id === category.parentId)
            if (!parentCategory) break
            category = parentCategory
          }
        })
    }

    return [...new Set(openCategories)] // Remove duplicates
  })

  if (!filteredList) {
    return <CircularProgress />
  }

  const renderCategory = (category: Category, depth: number): ReactNode => {
    // Check if any descendant (not just direct children) is selected
    const hasSelectedDescendant = (function hasSelectedDescendant(catId: number): boolean {
      const children = subCategories[catId]
      if (!children) return false
      return children.some((child) => isSelected(child.id) || hasSelectedDescendant(child.id))
    })(category.id)

    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <CategoryListItem $isSelected={isSelected(category.id)} $hasSelectedChild={hasSelectedDescendant}>
          <Box sx={{ display: 'flex', alignItems: 'stretch', borderRadius: (t) => t.radius.lg, overflow: 'hidden' }}>
            {typeof subCategories[category.id] !== 'undefined' ? (
              <ExpandButton
                $hasSelectedChild={hasSelectedDescendant}
                onClick={() => {
                  if (!open.includes(category.id)) {
                    setOpen((prev) => [...prev, category.id])
                  } else {
                    setOpen((prev) => prev.filter((c) => c !== category.id))
                  }
                }}
              >
                <IconLib.MdArrowForwardIos className={`rotatable ${open.includes(category.id) ? 'open' : ''}`} />
              </ExpandButton>
            ) : (
              <ExpandButton $hasSelectedChild={false} /> /* Placeholder for alignment */
            )}
            <Box
              onClick={() => click(category)}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexGrow: 1, py: 1, pr: 1 }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <ItemComponent item={category} {...additionalItemsProps} />
              </Box>
            </Box>
          </Box>
        </CategoryListItem>
        <Collapsible $isOpen={open.includes(category.id)}>
          <NestedCategoryContainer>
            {subCategories[category.id]?.map((item) => renderCategory(item, depth + 1))}
          </NestedCategoryContainer>
        </Collapsible>
      </Fragment>
    )
  }

  return renderCategory(rootCategory, 0)
}
