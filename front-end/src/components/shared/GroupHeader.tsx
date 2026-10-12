import { Typography } from '@mui/material'
import { FC } from 'react'

import { Row } from './Layout'

type Props = {
  title: string
  total?: string
}

const GroupHeader: FC<Props> = ({ title, total }) => (
  <>
    <Typography variant="subtitle1" textTransform="uppercase" color="textDisabled">
      {title}
    </Typography>

    {typeof total !== 'undefined' && (
      <Row sx={{ pl: 1, borderLeft: 2, borderColor: 'border.subtle' }}>
        <Typography variant="subtitle2" fontFamily="monospace" color="textDisabled">
          {total}
        </Typography>
      </Row>
    )}
  </>
)

export default GroupHeader
