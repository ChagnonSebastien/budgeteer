import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  selectedAccountName: string
  setSelectedAccount: (newAccount: { existing: boolean; id: number | null; name: string }) => void
  labelText: string
  errorText?: string
  myOwn: boolean
  allowNew?: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { selectedAccountName, setSelectedAccount, labelText, errorText, myOwn, allowNew = false } = props
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
        value={selectedAccountName}
        onFocus={(e) => {
          e.target.blur()
          setShowModal(true)
        }}
      />
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Select Account</DialogTitle>
        <DialogContent>
          <AccountList
            filterable={{ filter, setFilter }}
            accounts={accounts}
            onSelect={(selected) => {
              setSelectedAccount({ existing: true, id: selected.id, name: selected.name })
              setShowModal(false)
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
          {allowNew && (
            <Button
              onClick={() => {
                const filterRefAccount = accounts.find((a) => a.name.toLowerCase() === filter.toLowerCase())
                console.log(filterRefAccount, {
                  existing: typeof filterRefAccount !== 'undefined',
                  id: filterRefAccount?.id ?? null,
                  name: filterRefAccount?.name ?? filter,
                })
                setSelectedAccount({
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
