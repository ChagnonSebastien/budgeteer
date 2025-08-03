import { CircularProgress } from '@mui/material'
import { FC } from 'react'

import { Centered } from './shared/Layout'

const LoadingScreen: FC = () => (
  <Centered>
    <CircularProgress />
  </Centered>
)

export default LoadingScreen
