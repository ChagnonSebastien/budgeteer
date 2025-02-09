import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  valueText: string
  onAccountSelected?: (newAccount: { existing: boolean; id: number | null; name: string }) => void
  selected?: number[]
  onMultiSelect?: (newAccounts: number[]) => void
  labelText: string
  errorText?: string
  myOwn: boolean
  allowNew?: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { valueText, onAccountSelected, labelText, errorText, myOwn, allowNew = false, onMultiSelect, selected } = props
  const { myOwnAccounts, otherAccounts } = useContext(AccountServiceContext)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])

  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('')

  return (
    <>
      <TextField
        sx={{ width: '100%' }}
        variant="standard"
        helperText={errorText}
        type="text"
        label={labelText}
        placeholder={'None'}
        value={valueText}
        onFocus={(e) => {
          e.target.blur()
          setShowModal(true)
        }}
      />
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Select Account</DialogTitle>
        <DialogContent style={{ height: '70vh', overflow: 'hidden', padding: '0 20px' }}>
          <AccountList
            filterable={{ filter, setFilter }}
            accounts={accounts}
            onSelect={
              typeof onAccountSelected !== 'undefined'
                ? (selected) => {
                    onAccountSelected({ existing: true, id: selected.id, name: selected.name })
                    setShowModal(false)
                  }
                : undefined
            }
            onMultiSelect={
              typeof onMultiSelect !== 'undefined'
                ? (selected) => {
                    onMultiSelect(selected)
                  }
                : undefined
            }
            selected={selected}
            showZeroBalances={true}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
          {allowNew && typeof onAccountSelected !== 'undefined' && (
            <Button
              onClick={() => {
                const filterRefAccount = accounts.find((a) => a.name.toLowerCase() === filter.toLowerCase())
                onAccountSelected({
                  existing: typeof filterRefAccount !== 'undefined',
                  id: filterRefAccount?.id ?? null,
                  name: filterRefAccount?.name ?? filter,
                })
                setShowModal(false)
              }}
            >
              Confirm
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AccountPicker
