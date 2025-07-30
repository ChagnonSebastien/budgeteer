import { Fab, IconButton, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'
import { default as styled, keyframes } from 'styled-components'

import { IconToolsContext } from '../icons/IconTools'

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const SearchOverlayContainer = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 2rem;
  animation: ${fadeIn} 0.2s ease-out;

  /* When screen is wide enough for persistent drawer */
  @media (min-width: 840px) {
    left: 240px; /* Match drawer width */
  }

  /* When screen is narrow (mobile/tablet) */
  @media (max-width: 839px) {
    left: 0;
  }

  .MuiTextField-root {
    width: 100%;
    max-width: 600px;
    background: rgba(33, 33, 33, 0.9);
    backdrop-filter: blur(32px);
    border-radius: 12px;
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
    animation: ${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .MuiInputBase-root {
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .MuiOutlinedInput-notchedOutline {
    border: none;
  }

  .MuiInputBase-input {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.1rem;

    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
      opacity: 1;
    }
  }
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
        ev.stopPropagation()
        setShowSearch(false)
      }
    }
    document.addEventListener('keydown', handleEscape, true)
    return () => document.removeEventListener('keydown', handleEscape, true)
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
          onClick={() => setShowSearch(true)}
          sx={{
            position: 'absolute',
            bottom: '1rem',
            right: '2rem',
            zIndex: 1000,
            minWidth: filter.length > 0 ? 'auto' : '50px',
            width: filter.length > 0 ? 'auto' : '50px',
            height: '50px',
            borderRadius: filter.length > 0 ? '25px' : '50%',
            paddingLeft: filter.length > 0 ? 1.75 : 0,
            paddingRight: filter.length > 0 ? 0.75 : 0,
            transition: 'all 0.2s ease',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          }}
        >
          {filter.length > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.9rem',
              }}
            >
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
            </div>
          ) : (
            <IconLib.BiSearch style={{ fontSize: '1.5rem' }} />
          )}
        </Fab>
      )}
      {showSearch && (
        <SearchOverlayContainer onClick={() => setShowSearch(false)}>
          <TextField
            autoFocus
            fullWidth
            size="medium"
            placeholder={placeholder}
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
            onClick={(e) => e.stopPropagation()}
            slotProps={{
              input: {
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
                      fontSize: '1.8rem',
                      '&:hover': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <IconLib.IoCloseCircle />
                  </IconButton>
                ),
              },
            }}
          />
        </SearchOverlayContainer>
      )}
    </>
  )
}
