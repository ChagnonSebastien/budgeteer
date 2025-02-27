import { CircularProgress } from '@mui/material'
import { FC } from 'react'

const LoadingScreen: FC = () => (
  <div className="flex items-center justify-center h-full w-full">
    <CircularProgress />
  </div>
)

export default LoadingScreen
