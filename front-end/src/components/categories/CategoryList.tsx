import { Box, Button, CircularProgress } from '@mui/material'
import { Fragment, ReactNode, useContext, useMemo, useState } from 'react'
import { default as styled } from 'styled-components'

import Category, { CategoryID } from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { ItemListProps, MultiSelectConfiguration, SingleSelectConfiguration } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'

// Styled components only for complex hover effects and transitions
const CategoryListItem = styled.div<{ $isSelected: boolean; $hasSelectedChild: boolean }>`
  border-radius: 0.5rem;
  transition: all 200ms ease-in-out;
  border-left: 3px solid ${(props) => (props.$isSelected ? '#C84B31' : 'transparent')};
  margin: 0.125rem 0;
  background-color: ${(props) =>
    props.$isSelected
      ? 'rgba(200, 75, 49, 0.12)'
      : props.$hasSelectedChild
        ? 'rgba(200, 75, 49, 0.04)'
        : 'transparent'};

  &:hover {
    background-color: ${(props) =>
      props.$isSelected
        ? 'rgba(200, 75, 49, 0.16)'
        : props.$hasSelectedChild
          ? 'rgba(200, 75, 49, 0.08)'
          : 'rgba(128, 128, 128, 0.16)'};
  }
`

const ExpandButton = styled.div<{ $hasSelectedChild: boolean }>`
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: gray;

  &:hover {
    color: white;
  }

  .rotatable {
    transition: all 200ms ease-in-out;
    font-size: 1.1rem;

    &.open {
      transform: rotate(90deg);
    }
  }
`

const Collapsible = styled.div<{ $isOpen: boolean }>`
  max-height: ${(props) => (props.$isOpen ? 'none' : '0')};
  overflow: ${(props) => (props.$isOpen ? 'visible' : 'hidden')};
  transition: all 300ms ease-in-out;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
`

const NestedCategoryContainer = styled.div`
  margin-left: 1.5rem;
  position: relative;
  padding-left: 0.5rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: rgba(128, 128, 128, 0.24);
    border-radius: 0.125rem;
  }
`

interface CategoryListProps {
  buttonText?: string
}

type Props = ItemListProps<CategoryID, Category, object> & CategoryListProps

export const CategoryList = (props: Props) => {
  const { buttonText, items, selectConfiguration, filter, ItemComponent, additionalItemsProps } = props
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
  const [hoveringOver, setHoveringOver] = useState<CategoryID | null>(null)

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
        <CategoryListItem
          $isSelected={isSelected(category.id)}
          $hasSelectedChild={hasSelectedDescendant}
          onMouseEnter={() => setHoveringOver(category.id)}
          onTouchStart={() => setHoveringOver(category.id)}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderRadius: '0.75rem',
              overflow: 'hidden',
            }}
          >
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
            <div
              onClick={() => {
                if (typeof buttonText !== 'undefined') return
                click(category)
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
                padding: '0.5rem 0.5rem 0.5rem 0',
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <ItemComponent item={category} {...additionalItemsProps} />
              </Box>
              {hoveringOver === category.id &&
                typeof selectConfiguration !== 'undefined' &&
                selectConfiguration.mode === 'click' && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => selectConfiguration.onClick(category)}
                    style={{ opacity: 1, marginRight: '0.5rem' }}
                  >
                    {buttonText ?? 'Select'}
                  </Button>
                )}
            </div>
          </div>
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
