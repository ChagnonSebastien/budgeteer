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

  const [open, setOpen] = useState<number[]>([root.id])
  const [hoveringOver, setHoveringOver] = useState<number | null>(null)

  if (!categories) {
    return <CircularProgress />
  }

  const renderCategory = (category: Category, onSelect: (value: number) => void, depth: number): JSX.Element => {
    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <div
          className={`category-list-item ${selected.includes(category.id) ? 'selected' : ''}`}
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
                if (typeof buttonText !== 'undefined' || category.id === root.id) return
                if (onMultiSelect) {
                  const newSelected = selected.includes(category.id)
                    ? selected.filter((id) => id !== category.id)
                    : [...selected, category.id]
                  onMultiSelect(newSelected)
                } else if (onSelect) {
                  onSelect(category.id)
                }
              }}
              style={{ cursor: category.id === root.id ? 'default' : 'pointer' }}
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
