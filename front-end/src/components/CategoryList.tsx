import { Button, CircularProgress } from '@mui/material'
import { Fragment, useContext, useState } from 'react'

import IconCapsule from './IconCapsule'
import { IconToolsContext } from './IconTools'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'
import { doNothing } from '../utils'

import './CategoryList.css'

interface Props {
  categories?: Category[]
  onSelect?: (value: number) => void
  onMultiSelect?: (selected: number[]) => void
  selected?: number[]
  buttonText?: string
}

export const CategoryList = (props: Props) => {
  const { categories, onSelect, onMultiSelect, selected = [], buttonText } = props
  const { root, subCategories } = useContext(CategoryServiceContext)
  const { IconLib } = useContext(IconToolsContext)

  const [open, setOpen] = useState<number[]>(() => {
    // Initialize with root and any parent categories of selected items
    const openCategories = [root.id]

    // Find parent categories of selected items
    if (categories) {
      selected.forEach((selectedId) => {
        const initialCategory = categories.find((c) => c.id === selectedId)
        if (!initialCategory) return

        let category = initialCategory
        while (category.parentId && category.parentId !== root.id) {
          openCategories.push(category.parentId)
          const parentCategory = categories.find((c) => c.id === category.parentId)
          if (!parentCategory) break
          category = parentCategory
        }
      })
    }

    return [...new Set(openCategories)] // Remove duplicates
  })
  const [hoveringOver, setHoveringOver] = useState<number | null>(null)

  if (!categories) {
    return <CircularProgress />
  }

  // Get all descendant category IDs recursively
  const getAllDescendants = (categoryId: number): number[] => {
    const descendants: number[] = []
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
    while (current?.parentId && current.parentId !== root.id) {
      ancestors.push(current.parentId)
      current = categories.find((c) => c.id === current?.parentId)
    }

    return ancestors
  }

  const renderCategory = (category: Category, onSelect: (value: number) => void, depth: number): JSX.Element => {
    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <div
          className={`category-list-item ${selected.includes(category.id) || (category.parentId === null && selected.length === 0) ? 'selected' : ''} ${
            // Check if any descendant (not just direct children) is selected
            (function hasSelectedDescendant(catId: number): boolean {
              const children = subCategories[catId]
              if (!children) return false
              return children.some((child) => selected.includes(child.id) || hasSelectedDescendant(child.id))
            })(category.id)
              ? 'has-selected-child'
              : ''
          }`}
          onMouseEnter={() => setHoveringOver(category.id)}
          onTouchStart={() => setHoveringOver(category.id)}
        >
          <div className="category-content">
            {typeof subCategories[category.id] !== 'undefined' ? (
              <div
                className="expand-button"
                onClick={() => {
                  if (!open.includes(category.id)) {
                    setOpen((prev) => [...prev, category.id])
                  } else {
                    setOpen((prev) => prev.filter((c) => c !== category.id))
                  }
                }}
              >
                <IconLib.MdArrowForwardIos className={`rotatable ${open.includes(category.id) ? 'open' : ''}`} />
              </div>
            ) : (
              <div className="expand-button" /> /* Placeholder for alignment */
            )}
            <div
              className="category-main"
              onClick={() => {
                if (typeof buttonText !== 'undefined') return

                if (onMultiSelect) {
                  // If clicking root category and there are selections, clear them all
                  if (category.id === root.id) {
                    onMultiSelect([])
                    return
                  }

                  let newSelected: number[]
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
              style={{ cursor: 'pointer' }}
            >
              <div className="category-icon-container">
                <IconCapsule
                  iconName={category.iconName}
                  size={'2rem'}
                  color={category.iconColor}
                  backgroundColor={category.iconBackground}
                />
              </div>
              <div className="category-name">{category.name}</div>
              {hoveringOver === category.id && typeof buttonText !== 'undefined' && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onSelect(category.id)}
                  className="category-edit-button"
                >
                  {buttonText}
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className={`collapsible ${open.includes(category.id) ? 'open' : ''}`}>
          <div className="nested-category">
            {subCategories[category.id]?.map((item) => renderCategory(item, onSelect, depth + 1))}
          </div>
        </div>
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
      <div style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '4rem', position: 'relative' }}>
        {renderCategory(root, onSelect ?? doNothing, 0)}
      </div>
    </div>
  )
}
