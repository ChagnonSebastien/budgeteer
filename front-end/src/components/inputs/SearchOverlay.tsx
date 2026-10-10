import { alpha, Box, Fab, IconButton, TextField } from '@mui/material'
import { styled } from '@mui/material/styles'
import { keyframes } from '@mui/system'
import { Dispatch, SetStateAction, useContext, useEffect, useState } from 'react'

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

const SearchOverlayContainer = styled('div')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  bottom: 0,
  right: 0,
  left: 0,
  background: theme.palette.overlay.backdrop,
  backdropFilter: 'blur(12px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: theme.spacing(4),
  animation: `${fadeIn} 0.2s ease-out`,
  // Keeps the persistent drawer (240px wide past 840px) uncovered.
  '@media (min-width: 840px)': { left: 240 },

  '.MuiTextField-root': {
    width: '100%',
    maxWidth: 600,
    background: alpha(theme.palette.grey[900], 0.9),
    backdropFilter: 'blur(32px)',
    borderRadius: theme.radius.lg,
    boxShadow: theme.elevation.card,
    animation: `${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1)`,
  },

  '.MuiInputBase-root': {
    padding: theme.spacing(1.5, 2),
    borderRadius: theme.radius.lg,
  },

  '.MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },

  '.MuiInputBase-input': {
    color: theme.palette.text.primary,
    ...theme.typography.subtitle1,

    '&::placeholder': {
      color: theme.palette.text.disabled,
      opacity: 1,
    },
  },
}))

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
            bottom: (t) => t.spacing(2),
            right: (t) => t.spacing(4),
            zIndex: 1000,
            minWidth: filter.length > 0 ? 'auto' : '50px',
            width: filter.length > 0 ? 'auto' : '50px',
            height: '50px',
            borderRadius: filter.length > 0 ? '25px' : '50%',
            paddingLeft: filter.length > 0 ? 1.75 : 0,
            paddingRight: filter.length > 0 ? 0.75 : 0,
            transition: 'all 0.2s ease',
            boxShadow: (t) => t.elevation.card,
          }}
        >
          {filter.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                typography: 'body2',
              }}
            >
              <span>{`${filter}`}</span>
              <IconButton
                size="medium"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                sx={{ color: 'common.white', p: 0.5, '&:hover': { bgcolor: 'border.subtle' } }}
              >
                <IconLib.IoCloseCircle />
              </IconButton>
            </Box>
          ) : (
            <IconLib.BiSearch size={24} />
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
                    size="large"
                    sx={{
                      color: 'text.secondary',
                      p: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'border.subtle' },
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
