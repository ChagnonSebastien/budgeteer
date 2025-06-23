import { loader } from '@monaco-editor/react'
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

loader.config({ paths: { vs: '/vs' } })

window.MonacoEnvironment = {
  getWorkerUrl(_moduleId: string, _label: string) {
    // you can route different labels to different worker scripts if you like
    return `/vs/base/worker/workerMain.js`
  },
}

root.render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <App />
    </LocalizationProvider>
  </ThemeProvider>,
)
