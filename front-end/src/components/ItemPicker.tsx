import { Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import React, { CSSProperties, ReactNode, useEffect, useState } from 'react'
import styled from 'styled-components'

import ContentDialog from './ContentDialog'
import NamedItem from '../domain/model/NamedItem'

const StyledTextField = styled(TextField)<{ $customStyle?: CSSProperties }>`
  ${(props) => props.$customStyle && { ...props.$customStyle }}
`

const DialogContentContainer = styled(DialogContent)`
  height: 70vh;
  overflow: hidden;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
`

const SearchContainer = styled.div`
  padding: 16px 0;
  width: 100%;
`

export interface ItemPickerProps<T extends NamedItem> {
  items: T[]
  selectedItemId: number | null
  onItemSelected: (id: number) => void

  labelText: string
  dialogTitle?: string
  searchPlaceholder?: string
  style?: CSSProperties
  errorText?: string

  renderItemValue: (item: T | undefined) => string
  renderItemList: (props: ItemListProps<T>) => ReactNode

  allowNew?: boolean
  onNewItemSelected?: (name: string) => void

  // Optional additional actions for the dialog
  additionalActions?: ReactNode
}

export interface ItemListProps<T extends NamedItem> {
  items: T[]
  onSelect: (id: number) => void
  filterable: {
    filter: string
    setFilter: React.Dispatch<React.SetStateAction<string>>
  }
  onFilteredItemsChange: (items: T[]) => void
  focusedItemId: number | null
  hideSearchOverlay?: boolean
}

function ItemPicker<T extends NamedItem>(props: ItemPickerProps<T>) {
  const {
    items,
    selectedItemId,
    onItemSelected,
    labelText,
    dialogTitle,
    searchPlaceholder,
    style,
    errorText,
    renderItemValue,
    renderItemList,
    allowNew = false,
    onNewItemSelected,
    additionalActions,
  } = props

  const selectedItem = items.find((item) => item.id === selectedItemId)

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')
  const [focusedItemId, setFocusedItemId] = useState<number | null>(null)
  const [displayedItems, setDisplayedItems] = useState<T[]>([])

  // Handle filtered items change
  const handleFilteredItemsChange = (items: T[]) => {
    setDisplayedItems(items)
  }

  // Reset focused item when filter changes
  useEffect(() => {
    setFocusedItemId(null)
  }, [filter])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // If there's a focused item, select it
      if (focusedItemId !== null) {
        onItemSelected(focusedItemId)
        setShowModal(false)
        return
      }

      // If there's exactly one item in the filtered list, select it
      if (displayedItems.length === 1) {
        onItemSelected(displayedItems[0].id)
        setShowModal(false)
        return
      }

      // If allowNew is enabled, handle creating a new item
      if (allowNew && onNewItemSelected && filter.trim()) {
        const exactMatch = items.find((item) => item.hasName(filter))

        if (exactMatch) {
          onItemSelected(exactMatch.id)
        } else {
          onNewItemSelected(filter)
        }
        setShowModal(false)
      }
    } else if (e.key === 'ArrowDown') {
      // Navigate to next item
      if (displayedItems.length > 0) {
        const currentIndex = focusedItemId !== null ? displayedItems.findIndex((item) => item.id === focusedItemId) : -1

        // If we're at the end of the list, stay there
        if (currentIndex === displayedItems.length - 1) {
          return
        }

        // Otherwise move to the next item
        const nextIndex = currentIndex + 1
        setFocusedItemId(displayedItems[nextIndex].id)
      }
    } else if (e.key === 'ArrowUp') {
      // Navigate to previous item
      if (displayedItems.length > 0 && focusedItemId !== null) {
        const currentIndex = displayedItems.findIndex((item) => item.id === focusedItemId)

        // If we're at the top of the list, unfocus
        if (currentIndex === 0) {
          setFocusedItemId(null)
          return
        }

        // Otherwise move to the previous item
        const prevIndex = currentIndex - 1
        setFocusedItemId(displayedItems[prevIndex].id)
      }
    }
  }

  const handleConfirmClick = () => {
    if (filter.trim()) {
      // Check if there's an exact match
      const exactMatch = items.find((item) => item.hasName(filter))

      if (exactMatch) {
        // If there's an exact match, select it
        onItemSelected(exactMatch.id)
      } else if (allowNew && onNewItemSelected) {
        // Otherwise create a new item if allowed
        onNewItemSelected(filter)
      }
      setShowModal(false)
    }
  }

  // Determine if we should show the confirm button
  const showConfirmButton = allowNew && onNewItemSelected && filter.trim().length > 0

  return (
    <>
      <StyledTextField
        $customStyle={style}
        error={!!errorText}
        variant="standard"
        label={labelText}
        placeholder={'None'}
        value={renderItemValue(selectedItem)}
        helperText={errorText}
        onFocus={(e) => {
          setShowModal(true)
          e.target.blur()
        }}
        className="w-full"
      />
      <ContentDialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>{dialogTitle || `Select ${labelText}`}</DialogTitle>
        <DialogContentContainer>
          <SearchContainer>
            <TextField
              fullWidth
              variant="standard"
              placeholder={searchPlaceholder || `Search ${labelText.toLowerCase()}...`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </SearchContainer>
          {renderItemList({
            items,
            onSelect: (id) => {
              onItemSelected(id)
              setShowModal(false)
            },
            filterable: { filter, setFilter },
            onFilteredItemsChange: handleFilteredItemsChange,
            focusedItemId,
            hideSearchOverlay: true,
          })}
        </DialogContentContainer>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
          {showConfirmButton && (
            <Button onClick={handleConfirmClick} color="primary">
              Confirm
            </Button>
          )}
          {additionalActions}
        </DialogActions>
      </ContentDialog>
    </>
  )
}

export default ItemPicker
