import { Fab, IconButton, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import styled from 'styled-components'

import { IconToolsContext } from './IconTools'
import '../styles/search-overlay-tailwind.css'

const SearchButton = styled(Fab)`
  position: absolute;
  bottom: 1rem;
  right: 2rem;
  z-index: 1000;
`

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
        <SearchButton color="primary" size="medium" onClick={() => setShowSearch(true)} className="shadow-lg">
          <IconLib.BiSearch className="text-2xl" />
        </SearchButton>
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
                  className="text-white/70 p-2 hover:text-white/90 hover:bg-white/10"
                >
                  <IconLib.IoCloseCircle className="text-[1.8rem]" />
                </IconButton>
              ),
            }}
          />
        </div>
      )}
    </>
  )
}
