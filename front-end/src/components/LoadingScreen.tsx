import { CircularProgress } from '@mui/material'
import { FC } from 'react'

const LoadingScreen: FC = () => (
  <div className="centered">
    <CircularProgress />
  </div>
)

export default LoadingScreen
