import { Button, CircularProgress } from '@mui/material'
import { Fragment, useContext, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import Category, { CategoryID } from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import { doNothing } from '../../utils'
import IconCapsule from '../icons/IconCapsule'
import { IconToolsContext } from '../icons/IconTools'

// Styled components only for complex hover effects and transitions
const CategoryListItem = styled.div<{ isSelected: boolean; hasSelectedChild: boolean }>`
  border-radius: 0.5rem;
  transition: all 200ms ease-in-out;
  border-left: 3px solid ${(props) => (props.isSelected ? '#C84B31' : 'transparent')};
  margin: 0.125rem 0;
  background-color: ${(props) =>
    props.isSelected ? 'rgba(200, 75, 49, 0.12)' : props.hasSelectedChild ? 'rgba(200, 75, 49, 0.04)' : 'transparent'};

  &:hover {
    background-color: ${(props) =>
      props.isSelected
        ? 'rgba(200, 75, 49, 0.16)'
        : props.hasSelectedChild
          ? 'rgba(200, 75, 49, 0.08)'
          : 'rgba(255, 255, 255, 0.08)'};
  }
`

const ExpandButton = styled.div<{ hasSelectedChild: boolean }>`
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 200ms;

  &:hover {
    background-color: rgba(255, 255, 255, 0.04);
  }

  .rotatable {
    transition: all 200ms ease-in-out;
    opacity: ${(props) => (props.hasSelectedChild ? 1 : 0.7)};
    font-size: 1.1rem;
    color: ${(props) => (props.hasSelectedChild ? '#C84B31' : 'inherit')};

    &.open {
      transform: rotate(90deg);
    }
  }
`

const Collapsible = styled.div<{ isOpen: boolean }>`
  max-height: ${(props) => (props.isOpen ? 'none' : '0')};
  overflow: ${(props) => (props.isOpen ? 'visible' : 'hidden')};
  transition: all 300ms ease-in-out;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
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
    background-color: rgba(255, 255, 255, 0.12);
    border-radius: 0.125rem;
  }
`

interface Props {
  categories?: Category[]
  onSelect?: (value: CategoryID) => void
  onMultiSelect?: (selected: CategoryID[]) => void
  selected?: CategoryID[]
  buttonText?: string
  onScrollProgress?: (progress: number) => void
}

export const CategoryList = (props: Props) => {
  const { categories, onSelect, onMultiSelect, selected = [], buttonText, onScrollProgress } = props
  const { subCategories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)

  const [open, setOpen] = useState<CategoryID[]>(() => {
    // Initialize with root and any parent categories of selected items
    const openCategories = [rootCategory.id]

    // Find parent categories of selected items
    if (categories) {
      selected.forEach((selectedId) => {
        const initialCategory = categories.find((c) => c.id === selectedId)
        if (!initialCategory) return

        let category = initialCategory
        while (category.parentId && category.parentId !== rootCategory.id) {
          openCategories.push(category.parentId)
          const parentCategory = categories.find((c) => c.id === category.parentId)
          if (!parentCategory) break
          category = parentCategory
        }
      })
    }

    return [...new Set(openCategories)] // Remove duplicates
  })
  const [hoveringOver, setHoveringOver] = useState<CategoryID | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onScrollProgress || !scrollContainerRef.current) return
    const element = scrollContainerRef.current

    const handleScroll = () => {
      const maxScroll = element.scrollHeight - element.clientHeight
      const bufferZone = 64 // 4rem
      if (maxScroll <= 0) {
        onScrollProgress(0)
      } else {
        const remainingScroll = maxScroll - element.scrollTop
        if (remainingScroll > bufferZone) {
          onScrollProgress(1)
        } else {
          const progress = remainingScroll / bufferZone
          onScrollProgress(Math.max(0, Math.min(1, progress)))
        }
      }
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll)
    const observer = new ResizeObserver(handleScroll)
    observer.observe(element)

    return () => {
      element.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [onScrollProgress, categories, open])

  if (!categories) {
    return <CircularProgress />
  }

  // Get all descendant category IDs recursively
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

  // Get all ancestor category IDs recursively
  const getAllAncestors = (categoryId: number): number[] => {
    const ancestors: number[] = []
    if (!categories) return ancestors

    let current = categories.find((c) => c.id === categoryId)
    while (current?.parentId && current.parentId !== rootCategory.id) {
      ancestors.push(current.parentId)
      current = categories.find((c) => c.id === current?.parentId)
    }

    return ancestors
  }

  const renderCategory = (category: Category, onSelect: (value: CategoryID) => void, depth: number): JSX.Element => {
    const isSelected =
      selected.includes(category.id) ||
      (typeof onMultiSelect !== 'undefined' && category.parentId === null && selected.length === 0)

    // Check if any descendant (not just direct children) is selected
    const hasSelectedDescendant = (function hasSelectedDescendant(catId: number): boolean {
      const children = subCategories[catId]
      if (!children) return false
      return children.some((child) => selected.includes(child.id) || hasSelectedDescendant(child.id))
    })(category.id)

    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <CategoryListItem
          isSelected={isSelected}
          hasSelectedChild={hasSelectedDescendant}
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
                hasSelectedChild={hasSelectedDescendant}
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
              <ExpandButton hasSelectedChild={false} /> /* Placeholder for alignment */
            )}
            <div
              onClick={() => {
                if (typeof buttonText !== 'undefined') return

                if (onMultiSelect) {
                  // If clicking root category and there are selections, clear them all
                  if (category.id === rootCategory.id) {
                    onMultiSelect([])
                    return
                  }

                  let newSelected: CategoryID[]
                  if (selected.includes(category.id)) {
                    // If deselecting, just remove this category
                    newSelected = selected.filter((id) => id !== category.id)
                  } else {
                    // If selecting, remove all descendants and ancestors first
                    const descendants = getAllDescendants(category.id)
                    const ancestors = getAllAncestors(category.id)
                    const toRemove = new Set([...descendants, ...ancestors])
                    newSelected = [...selected.filter((id) => !toRemove.has(id)), category.id]
                  }
                  onMultiSelect(newSelected)
                } else if (onSelect) {
                  onSelect(category.id)
                }
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
                padding: '0.5rem 0.5rem 0.5rem 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
                <IconCapsule
                  iconName={category.iconName}
                  size={'2rem'}
                  color={category.iconColor}
                  backgroundColor={category.iconBackground}
                />
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  color: 'rgba(255, 255, 255, 0.87)',
                  flexGrow: 1,
                }}
              >
                {category.name}
              </div>
              {hoveringOver === category.id && typeof buttonText !== 'undefined' && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onSelect(category.id)}
                  style={{ opacity: 1, marginRight: '0.5rem' }}
                >
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        </CategoryListItem>
        <Collapsible isOpen={open.includes(category.id)}>
          <NestedCategoryContainer>
            {subCategories[category.id]?.map((item) => renderCategory(item, onSelect, depth + 1))}
          </NestedCategoryContainer>
        </Collapsible>
      </Fragment>
    )
  }

  return (
    <div
      style={{
        minWidth: '20rem',
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div
        ref={scrollContainerRef}
        className="custom-scrollbar"
        style={{
          overflowY: 'auto',
          flexGrow: 1,
          paddingBottom: '4rem',
          position: 'relative',
        }}
      >
        {renderCategory(rootCategory, onSelect ?? doNothing, 0)}
      </div>
    </div>
  )
}
