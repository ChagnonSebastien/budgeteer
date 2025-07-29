import { Typography } from '@mui/material'

import Category, { CategoryID } from '../../domain/model/category'
import { ItemProps } from '../accounts/ItemList'
import IconCapsule from '../icons/IconCapsule'
import { Row } from '../shared/NoteContainer'

type Props = ItemProps<CategoryID, Category, unknown>

export const CategoryCard = (props: Props) => {
  const { item } = props

  return (
    <Row style={{ alignItems: 'center', gap: '1rem' }}>
      <IconCapsule
        iconName={item.iconName}
        size={'2rem'}
        color={item.iconColor}
        backgroundColor={item.iconBackground}
      />
      <Typography flexGrow={1} variant="subtitle1">
        {item.name}
      </Typography>
    </Row>
  )
}
