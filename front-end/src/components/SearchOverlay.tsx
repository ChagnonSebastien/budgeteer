import { Fab, IconButton, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'

import { IconToolsContext } from './IconTools'
import '../styles/search-overlay.css'

interface Props {
  filter: string
  setFilter: Dispatch<SetStateAction<string>>
  placeholder?: string
}

export const SearchOverlay = ({ filter, setFilter, placeholder = 'Search...' }: Props) => {
  const { IconLib } = useContext(IconToolsContext)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleEscape = (ev: KeyboardEvent) => {
      if ((ev.key === 'Escape' || ev.key === 'Enter') && showSearch) {
        setShowSearch(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showSearch])

  const handleClose = () => {
    setFilter('')
    setShowSearch(false)
  }

  return (
    <>
      {!showSearch && (
        <Fab
          color="primary"
          size="medium"
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '2rem',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
          onClick={() => setShowSearch(true)}
        >
          <IconLib.BiSearch style={{ fontSize: '1.5rem' }} />
        </Fab>
      )}
      {showSearch && (
        <div className="search-overlay" onClick={handleClose}>
          <TextField
            autoFocus
            fullWidth
            size="medium"
            placeholder={placeholder}
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
            onClick={(e) => e.stopPropagation()}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose()
                  }}
                  size="medium"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: '8px',
                    '&:hover': {
                      color: 'rgba(255, 255, 255, 0.9)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <IconLib.IoCloseCircle style={{ fontSize: '1.8rem' }} />
                </IconButton>
              ),
            }}
          />
        </div>
      )}
    </>
  )
}
