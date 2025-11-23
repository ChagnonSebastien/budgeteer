import { Typography } from '@mui/material'

import TransactionGroup, { TransactionGroupID } from '../../domain/model/transactionGroup'
import { ItemProps } from '../accounts/ItemList'
import { Row } from '../shared/Layout'

type Props = ItemProps<TransactionGroupID, TransactionGroup, unknown>

export const TransactionGroupCard = (props: Props) => {
  const { item } = props

  return (
    <Row style={{ alignItems: 'center', gap: '1rem' }}>
      <Typography flexGrow={1} variant="subtitle1">
        {item.name}
      </Typography>
    </Row>
  )
}
