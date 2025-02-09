import { Fab, TextField } from '@mui/material'
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
          }}
          onClick={() => setShowSearch(true)}
        >
          <IconLib.BiSearch style={{ fontSize: '1.5rem' }} />
        </Fab>
      )}
      {showSearch && (
        <div
          className="search-overlay"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="search-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              autoFocus
              fullWidth
              size="medium"
              placeholder={placeholder}
              value={filter}
              onChange={(ev) => setFilter(ev.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconLib.IoCloseCircle
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => {
                        setFilter('')
                        setShowSearch(false)
                      }}
                    />
                  ),
                },
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
