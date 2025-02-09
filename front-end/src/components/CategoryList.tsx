import { Button, CircularProgress, IconButton, ListItemButton } from '@mui/material'
import { ElementType, Fragment, useContext, useState } from 'react'

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

  const ListItem: ElementType = buttonText ? 'div' : ListItemButton

  const renderCategory = (category: Category, onSelect: (value: number) => void, depth: number): JSX.Element => {
    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <ListItem
          style={{
            paddingLeft: `${Math.max(depth - (typeof subCategories[category.id] !== 'undefined' ? 1 : 0), 0) * 2 + 1}rem`,
            paddingTop: '.3rem',
            paddingBottom: '.3rem',
          }}
          onMouseEnter={() => {
            setHoveringOver(category.id)
          }}
          onTouchStart={() => {
            setHoveringOver(category.id)
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {depth > 0 && typeof subCategories[category.id] !== 'undefined' && (
              <div
                onClick={() => {
                  if (!open.includes(category.id)) {
                    setOpen((prev) => [...prev, category.id])
                  } else {
                    setOpen((prev) => prev.filter((c) => c !== category.id))
                  }
                }}
                style={{ paddingRight: '0.25rem' }}
              >
                <IconButton size="small">
                  <IconLib.MdArrowForwardIos className={`rotatable ${open.includes(category.id) ? 'open' : ''}`} />
                </IconButton>
              </div>
            )}
            <div
              style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: selected.includes(category.id) ? 'rgba(0, 0, 0, 0.04)' : undefined,
                cursor: category.id === root.id ? 'default' : 'pointer',
              }}
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
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {onMultiSelect &&
                  category.id !== root.id &&
                  (selected.includes(category.id) ? (
                    <IconLib.FaRegSquareCheck size="1.25rem" style={{ marginRight: '0.5rem', opacity: 0.8 }} />
                  ) : (
                    <IconLib.FaRegSquare size="1.25rem" style={{ marginRight: '0.5rem', opacity: 0.5 }} />
                  ))}
                <IconCapsule
                  iconName={category.iconName}
                  size={'2rem'}
                  color={category.iconColor}
                  backgroundColor={category.iconBackground}
                />
              </div>
              <div style={{ width: '1rem' }} />
              <div>{category.name}</div>
              <div style={{ flexGrow: 1 }} />
            </div>
            {hoveringOver === category.id && typeof buttonText !== 'undefined' && (
              <Button variant="contained" size="small" onClick={() => onSelect(category.id)}>
                {buttonText}
              </Button>
            )}
          </div>
        </ListItem>
        <div className={`collapsible ${open.includes(category.id) ? 'open' : ''}`}>
          {subCategories[category.id]?.map((item) => renderCategory(item, onSelect, depth + 1))}
        </div>
      </Fragment>
    )
  }

  return renderCategory(root, onSelect ?? doNothing, 0)
}
