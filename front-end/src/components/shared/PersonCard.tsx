import { Typography } from '@mui/material'

import { Column } from './Layout'
import { Email, Person } from '../../domain/model/transactionGroup'
import { ItemProps } from '../accounts/ItemList'

const PersonCard = (props: ItemProps<Email, Person, unknown>) => {
  const { item, selected = false, onClick = () => {} } = props

  return (
    <Column onClick={onClick}>
      <Typography>{item.name}</Typography>
      <Typography color="textDisabled">{item.email}</Typography>
    </Column>
  )
}

export default PersonCard
