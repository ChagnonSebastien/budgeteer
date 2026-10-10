import {
  Box,
  Button,
  ClickAwayListener,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  SxProps,
  TextField,
  Theme,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import React, { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { NotEmptyValidator, Validator } from './Validator'
import NamedItem from '../../domain/model/NamedItem'
import ItemList, { ItemListProps, ItemProps } from '../accounts/ItemList'
import AppDialog from '../shared/AppDialog'
import { CustomScrolling } from '../shared/CustomScrolling'

const SearchContainer = styled('div')(({ theme }) => ({
  paddingBottom: theme.spacing(2),
  width: '100%',
}))

const defaultValidator = new NotEmptyValidator()

export type ItemPickerVariant = 'modal' | 'dropdown'

export interface ItemPickerProps<ItemID, T extends NamedItem<ItemID, T>, AdditionalItemProps> {
  items: T[]

  labelText: string
  dialogTitle?: string
  searchPlaceholder?: string
  sx?: SxProps<Theme>
  errorText?: string

  variant?: ItemPickerVariant

  itemDisplayText?: (item: T | undefined) => string

  allowNew?: boolean
  newItemStringValidator?: Validator
  onNewItemSelected?: (name: string) => void

  OverrideTextLabel?: FC<{ onClick(): void }>
  additionalActions?: ReactNode
  doesStringMatchItem?(s: string, item: T): boolean
  doesStringMatchItemPerfectly?(s: string, item: T): boolean
  cleanFilterOnModalOpen?: boolean

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
    sx,
    errorText,
    variant = 'modal',
    itemDisplayText = (item: T | undefined) => item?.name ?? '',
    allowNew = false,
    newItemStringValidator = defaultValidator,
    onNewItemSelected,

    OverrideTextLabel,
    additionalActions,
    cleanFilterOnModalOpen = typeof OverrideTextLabel != 'undefined',

    selectedItemId,
    onSelectItem,
    doesStringMatchItem = (s: string, item: T) => itemDisplayText(item).toLowerCase().includes(s.toLowerCase()),
    doesStringMatchItemPerfectly = (s: string, item: T) => itemDisplayText(item).toLowerCase() === s.toLowerCase(),

    ItemListComponent = ItemList,
    ItemComponent,
    additionalItemProps,
  } = props

  const selectedItem = items.find((item) => item.id === selectedItemId)

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')
  const [focusedItemId, setFocusedItemId] = useState<ItemID | null>(null)
  const [failedCreatingOnce, setFailedCreatingOnce] = useState(false)

  const anchorRef = useRef<HTMLDivElement>(null)
  const focusedItemRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Drop focus from the field once a value has been picked, so the input no
  // longer looks selected/active after a selection.
  const blurInput = () => inputRef.current?.blur()

  const displayedItems = useMemo(() => {
    if (filter === '') return items
    return items.filter((i) => doesStringMatchItem(filter, i))
  }, [items, filter, itemDisplayText])

  const filterAsNewValueValidation = useMemo(
    () => newItemStringValidator.validate(filter),
    [newItemStringValidator, filter],
  )

  useEffect(() => {
    setFocusedItemId(null)
  }, [filter])

  useEffect(() => {
    if (cleanFilterOnModalOpen && showModal) {
      setFilter('')
      setFailedCreatingOnce(false)
    }
  }, [cleanFilterOnModalOpen, showModal])

  useEffect(() => {
    focusedItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [focusedItemId])

  const handleConfirmClick = () => {
    // If there's a focused item, select it
    if (focusedItemId !== null) {
      onSelectItem(focusedItemId)
      setShowModal(false)
      blurInput()
      return
    }

    const cleanedValue = filter.trim()

    // Check if there's an exact match
    const exactMatch = items.filter((item) => doesStringMatchItemPerfectly(cleanedValue, item))
    if (exactMatch.length > 1) return

    if (exactMatch.length === 1) {
      // If there's an exact match, select it
      onSelectItem(exactMatch[0].id)
      setShowModal(false)
      blurInput()
      return
    }

    if (allowNew && onNewItemSelected) {
      // Create a new item if allowed
      if (filterAsNewValueValidation.isOk()) {
        onNewItemSelected(cleanedValue)
        setShowModal(false)
        blurInput()
      } else {
        setFailedCreatingOnce(true)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      handleConfirmClick()
      e.preventDefault()
      return
    }

    if (e.key === 'ArrowDown') {
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

  // Determine if we should show the confirm button
  const showConfirmButton = allowNew && onNewItemSelected && filter.trim().length > 0

  const trimmedFilter = filter.trim()
  const hasExactMatch = items.some((item) => doesStringMatchItemPerfectly(trimmedFilter, item))
  const showCreateRow = allowNew && !!onNewItemSelected && trimmedFilter.length > 0 && !hasExactMatch

  const createNew = () => {
    if (!onNewItemSelected) return
    if (filterAsNewValueValidation.isOk()) {
      onNewItemSelected(trimmedFilter)
      setShowModal(false)
      setFilter('')
      blurInput()
    } else {
      setFailedCreatingOnce(true)
    }
  }

  if (variant === 'dropdown') {
    return (
      <ClickAwayListener onClickAway={() => setShowModal(false)}>
        <Box ref={anchorRef} sx={[...(Array.isArray(sx) ? sx : [sx]), { width: '100%' }]}>
          <TextField
            fullWidth
            variant="standard"
            label={labelText}
            placeholder="None"
            inputRef={inputRef}
            value={showModal ? filter : itemDisplayText(selectedItem)}
            error={!!errorText || (failedCreatingOnce && filterAsNewValueValidation.isErr())}
            helperText={
              failedCreatingOnce && filterAsNewValueValidation.isErr() ? filterAsNewValueValidation.error : errorText
            }
            onFocus={(e) => {
              setShowModal(true)
              setFilter('')
              e.target.select()
            }}
            onChange={(e) => {
              setFilter(e.target.value)
              setShowModal(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowModal(false)
                return
              }
              handleKeyDown(e)
            }}
          />
          <Popper
            open={showModal}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            sx={{ zIndex: (t) => t.zIndex.modal, width: anchorRef.current?.clientWidth }}
          >
            <Paper elevation={3} sx={{ maxHeight: '40vh', overflowY: 'auto' }}>
              <MenuList dense>
                {displayedItems.map((item) => (
                  <MenuItem
                    key={`dropdown-item-${item.id}`}
                    ref={item.id === focusedItemId ? focusedItemRef : undefined}
                    selected={item.id === focusedItemId || item.id === selectedItemId}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelectItem(item.id)
                      setShowModal(false)
                      setFilter('')
                      blurInput()
                    }}
                  >
                    {itemDisplayText(item)}
                  </MenuItem>
                ))}
                {showCreateRow && (
                  <MenuItem onMouseDown={(e) => e.preventDefault()} onClick={createNew}>
                    Create &quot;{trimmedFilter}&quot;
                  </MenuItem>
                )}
                {displayedItems.length === 0 && !showCreateRow && <MenuItem disabled>No matches</MenuItem>}
              </MenuList>
            </Paper>
          </Popper>
        </Box>
      </ClickAwayListener>
    )
  }

  return (
    <>
      {OverrideTextLabel ? (
        <OverrideTextLabel onClick={() => setShowModal(true)} />
      ) : (
        <TextField
          sx={sx}
          error={!!errorText}
          variant="standard"
          label={labelText}
          placeholder={'None'}
          inputRef={inputRef}
          value={itemDisplayText(selectedItem)}
          helperText={errorText}
          onFocus={(e) => {
            setShowModal(true)
            e.target.blur()
          }}
        />
      )}
      <AppDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        disableRestoreFocus
        title={dialogTitle || `Select ${labelText}`}
        actions={
          <>
            <Button color="inherit" onClick={() => setShowModal(false)}>
              Close
            </Button>
            {additionalActions}
            {showConfirmButton && (
              <Button variant="contained" onClick={handleConfirmClick}>
                Confirm
              </Button>
            )}
          </>
        }
        contentSx={{ maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <SearchContainer>
          <TextField
            fullWidth
            variant="standard"
            placeholder={searchPlaceholder || `Search ${labelText.toLowerCase()}...`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
            onKeyDown={handleKeyDown}
            helperText={failedCreatingOnce ? filterAsNewValueValidation.error : ''}
            error={failedCreatingOnce && filterAsNewValueValidation.isErr()}
          />
        </SearchContainer>
        <Box component={CustomScrolling} sx={{ minHeight: 0 }}>
          <ItemListComponent
            items={displayedItems}
            ItemComponent={ItemComponent}
            additionalItemsProps={additionalItemProps}
            selectConfiguration={{
              mode: 'single',
              onSelectItem: (item: ItemID) => {
                setShowModal(false)
                onSelectItem(item)
                blurInput()
              },
              selectedItem: selectedItemId,
            }}
          />
        </Box>
      </AppDialog>
    </>
  )
}

export default ItemPicker
