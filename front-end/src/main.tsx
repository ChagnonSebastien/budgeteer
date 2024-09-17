import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

const container = document.getElementById('root')
const root = createRoot(container!)

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C84B31',
    },
    secondary: {
      main: '#D6D5A8',
    },
    background: {
      default: '#222225',
    },
  },
})

root.render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <App />
    </LocalizationProvider>
  </ThemeProvider>,
)
