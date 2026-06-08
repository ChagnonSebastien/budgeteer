import { CssBaseline, ThemeProvider } from '@mui/material'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { GuestLogin } from './GuestLogin'
import { darkTheme } from './theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <GuestLogin />
    </ThemeProvider>
  </React.StrictMode>,
)
