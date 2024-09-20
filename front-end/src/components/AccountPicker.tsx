import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  selectedAccountId: number | null
  setSelectedAccountId: (id: number) => void
  labelText: string
  errorText?: string
  myOwn: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { selectedAccountId, setSelectedAccountId, labelText, errorText, myOwn } = props
  const { myOwnAccounts, otherAccounts } = useContext(AccountServiceContext)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])
  const selectedAccount = useMemo(() => accounts.find((a) => a.id === selectedAccountId), [accounts, selectedAccountId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <TextField
        sx={{ width: '100%' }}
        variant="standard"
        helperText={errorText}
        type="text"
        label={labelText}
        placeholder={'None'}
        value={selectedAccount?.name}
        onFocus={(e) => {
          e.target.blur()
          setShowModal(true)
        }}
      />
      <Dialog open={showModal} onClose={() => setShowModal(false)}>
        <DialogTitle>Select Account</DialogTitle>
        <DialogContent>
          <AccountList
            filterable
            accounts={accounts}
            onSelect={(newParent) => {
              setSelectedAccountId(newParent)
              setShowModal(false)
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AccountPicker
