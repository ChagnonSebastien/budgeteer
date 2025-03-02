import { Fab, IconButton, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import styled from 'styled-components'

import { IconToolsContext } from './IconTools'
import '../styles/search-overlay-tailwind.css'

const FloatingButton = styled(Fab)`
  position: absolute;
  bottom: 1rem;
  right: 2rem;
  z-index: 1000;
`

const FilterText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
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
        <FloatingButton
          color="primary"
          size="medium"
          onClick={() => setShowSearch(true)}
          className="shadow-lg"
          sx={{
            minWidth: filter.length > 0 ? 'auto' : '50px',
            width: filter.length > 0 ? 'auto' : '50px',
            height: '50px',
            borderRadius: filter.length > 0 ? '25px' : '50%',
            paddingLeft: filter.length > 0 ? 1.75 : 0,
            paddingRight: filter.length > 0 ? 0.75 : 0,
            transition: 'all 0.2s ease',
          }}
        >
          {filter.length > 0 ? (
            <FilterText>
              <span>{`${filter}`}</span>
              <IconButton
                size="medium"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                sx={{
                  color: 'white',
                  padding: '4px',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <IconLib.IoCloseCircle />
              </IconButton>
            </FilterText>
          ) : (
            <IconLib.BiSearch className="text-2xl" />
          )}
        </FloatingButton>
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
