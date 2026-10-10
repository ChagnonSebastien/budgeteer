import { styled } from '@mui/material/styles'

import { Column } from './Layout'

export const CustomScrolling = styled(Column)(({ theme }) => ({
  overflowY: 'auto',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: 6,
    height: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.border.default,
    borderRadius: 3,
    transition: 'background-color 200ms',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.border.strong,
  },
  scrollbarColor: `${theme.palette.border.default} transparent`,
}))
