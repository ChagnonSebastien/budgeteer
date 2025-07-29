import { Button, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import React, { CSSProperties, FC, ReactNode, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import NamedItem from '../../domain/model/NamedItem'
import ItemList, { ItemListProps, ItemProps } from '../accounts/ItemList'
import ContentDialog from '../shared/ContentDialog'
import { CustomScrollbarContainer } from '../shared/CustomScrollbarContainer'

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

export interface ItemPickerProps<ItemID, T extends NamedItem<ItemID, T>, AdditionalItemProps> {
  items: T[]

  labelText: string
  dialogTitle?: string
  searchPlaceholder?: string
  style?: CSSProperties
  errorText?: string

  itemDisplayText: (item: T | undefined) => string

  allowNew?: boolean
  onNewItemSelected?: (name: string) => void

  // Optional additional actions for the dialog
  additionalActions?: ReactNode

  selectedItemId: ItemID | null
  onSelectItem: (item: ItemID) => void

  ItemListComponent?: FC<ItemListProps<ItemID, T, AdditionalItemProps>>
  ItemComponent: FC<ItemProps<ItemID, T, AdditionalItemProps>>
  additionalItemProps: AdditionalItemProps
}

function ItemPicker<ItemID, T extends NamedItem<ItemID, T>, AdditionalItemProps>(
  props: ItemPickerProps<ItemID, T, AdditionalItemProps>,
) {
  const {
    items,
    labelText,
    dialogTitle,
    searchPlaceholder,
    style,
    errorText,
    itemDisplayText,
    allowNew = false,
    onNewItemSelected,
    additionalActions,

    selectedItemId,
    onSelectItem,

    ItemListComponent = ItemList,
    ItemComponent,
    additionalItemProps,
  } = props

  const selectedItem = items.find((item) => item.id === selectedItemId)

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')
  const [focusedItemId, setFocusedItemId] = useState<ItemID | null>(null)

  const displayedItems = useMemo(() => {
    if (filter === '') return items
    return items.filter((i) => itemDisplayText(i).toLowerCase().includes(filter.toLowerCase()))
  }, [items, filter, itemDisplayText])

  useEffect(() => {
    setFocusedItemId(null)
  }, [filter])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // If there's a focused item, select it
      if (focusedItemId !== null) {
        onSelectItem(focusedItemId)
        setShowModal(false)
        return
      }

      // If there's exactly one item in the filtered list, select it
      if (displayedItems.length === 1) {
        onSelectItem(displayedItems[0].id)
        setShowModal(false)
        return
      }

      // If allowNew is enabled, handle creating a new item
      if (allowNew && onNewItemSelected && filter.trim()) {
        const exactMatch = items.find((item) => item.hasName(filter))

        if (exactMatch) {
          onSelectItem(exactMatch.id)
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
        onSelectItem(exactMatch.id)
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
      <TextField
        sx={style}
        error={!!errorText}
        variant="standard"
        label={labelText}
        placeholder={'None'}
        value={itemDisplayText(selectedItem)}
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
          <CustomScrollbarContainer>
            <ItemListComponent
              items={displayedItems}
              ItemComponent={ItemComponent}
              additionalItemsProps={additionalItemProps}
              selectConfiguration={{
                mode: 'single',
                onSelectItem: (item: ItemID) => {
                  setShowModal(false)
                  onSelectItem(item)
                },
                selectedItem: selectedItemId,
              }}
            />
          </CustomScrollbarContainer>
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
