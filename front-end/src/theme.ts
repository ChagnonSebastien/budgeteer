import { createTheme } from '@mui/material'

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C84B31',
    },
    secondary: {
      main: '#D6D5A8',
    },
    background: {
      default: '#1F1F1F',
    },
  },
  components: {
    // Forms/pickers use the secondary color for the focus accent (label +
    // underline/outline) instead of the primary brand color.
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused': {
            color: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:after': {
            borderBottomColor: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        underline: ({ theme }) => ({
          '&:after': {
            borderBottomColor: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.secondary.main,
          },
        }),
      },
    },
  },
})
