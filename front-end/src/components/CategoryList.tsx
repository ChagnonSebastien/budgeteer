import { CircularProgress, ListItemButton } from '@mui/material'
import { Fragment, useContext } from 'react'

import IconCapsule from './IconCapsule'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'
import { doNothing } from '../utils'

interface Props {
  categories?: Category[]
  onSelect?: (value: number) => void
}

export const CategoryList = (props: Props) => {
  const { categories, onSelect } = props
  const { root, subCategories } = useContext(CategoryServiceContext)

  if (!categories) {
    return <CircularProgress />
  }

  const renderCategory = (category: Category, onSelect: (value: number) => void, depth: number): JSX.Element => {
    return (
      <Fragment key={`category-list-id-${category.id}`}>
        <ListItemButton onClick={() => onSelect(category.id)} style={{ paddingLeft: `${depth * 2 + 1}rem` }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <IconCapsule
              iconName={category.iconName}
              size={'2rem'}
              color={category.iconColor}
              backgroundColor={category.iconBackground}
            />
            <div style={{ width: '1rem' }} />
            <div>{category.name}</div>
          </div>
        </ListItemButton>
        {subCategories[category.id]?.map((c) => renderCategory(c, onSelect, depth + 1))}
      </Fragment>
    )
  }

  return renderCategory(root, onSelect ?? doNothing, 0)
}
