import { Alert, AlertTitle, Button, Stack, TextField, Typography } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'

import { ManagedUser, UserDeletionImpact } from '../../domain/model/user'
import { UserStoreContext } from '../../service/ServiceContext'
import LoadingScreen from '../LoadingScreen'
import AppDialog from '../shared/AppDialog'
import { SecureButton } from '../shared/SecureButton'
import { useToast } from '../shared/ToastProvider'

const plural = (count: number, word: string, words = `${word}s`) => `${count} ${count === 1 ? word : words}`

const DeleteUserDialog: FC<{ user: ManagedUser; onClose(): void; onDeleted(): void }> = ({
  user,
  onClose,
  onDeleted,
}) => {
  const userStore = useContext(UserStoreContext)
  const { showToast } = useToast()
  const [impact, setImpact] = useState<UserDeletionImpact | null>(null)
  const [error, setError] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    userStore
      ?.getDeletionImpact(user.id)
      .then(setImpact)
      .catch((e) => {
        console.error(e)
        setError(true)
      })
  }, [userStore, user.id])

  const blocked = impact === null || impact.blockingTransactionGroups.length > 0
  const confirmed = confirmation.trim().toLowerCase() === user.email.toLowerCase()

  const confirm = async () => {
    try {
      await userStore!.delete(user.id)
      showToast(`${user.email} and all their data were deleted`)
      onDeleted()
    } catch (e) {
      console.error(e)
      showToast(`Could not delete ${user.email}`, 'error')
    }
  }

  const deleted = impact
    ? [
        plural(impact.transactions, 'transaction'),
        plural(impact.accounts, 'account'),
        plural(impact.categories, 'category', 'categories'),
        plural(impact.currencies, 'asset', 'assets'),
      ]
    : []

  return (
    <AppDialog
      open
      onClose={onClose}
      title={`Delete ${user.name}?`}
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <SecureButton variant="contained" color="error" disabled={blocked || !confirmed} onClick={confirm}>
            Delete user permanently
          </SecureButton>
        </>
      }
    >
      {error ? (
        <Alert severity="error">Could not check what deleting this user would remove.</Alert>
      ) : impact === null ? (
        <LoadingScreen />
      ) : impact.blockingTransactionGroups.length > 0 ? (
        <Alert severity="error">
          <AlertTitle>This user cannot be deleted</AlertTitle>
          They created {impact.blockingTransactionGroups.length === 1 ? 'a shared group' : 'shared groups'} that other
          people are in: {impact.blockingTransactionGroups.join(', ')}. The amounts of a group are in its creator's
          currency, so deleting this user would break it for everyone. The{' '}
          {impact.blockingTransactionGroups.length === 1 ? 'group has' : 'groups have'} to be deleted first.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <Alert severity="error">
            <AlertTitle>This cannot be undone</AlertTitle>
            Everything {user.email} has in Budgeteer will be permanently deleted, exactly as if they deleted it all
            themselves: {deleted.join(', ')}. There is no backup to restore from.
          </Alert>

          {(impact.movedToUnconfirmed > 0 || impact.deletedTransactionGroups.length > 0) && (
            <Alert severity="warning">
              <Stack spacing={0.5}>
                {impact.movedToUnconfirmed > 0 && (
                  <span>
                    {plural(impact.movedToUnconfirmed, 'shared expense')} will become unconfirmed, so the other members
                    of their groups keep seeing them. Their group memberships and settlements stay.
                  </span>
                )}
                {impact.deletedTransactionGroups.length > 0 && (
                  <span>
                    {impact.deletedTransactionGroups.length === 1 ? 'Their group' : 'Their groups'}{' '}
                    {impact.deletedTransactionGroups.join(', ')}, with nobody else in{' '}
                    {impact.deletedTransactionGroups.length === 1 ? 'it' : 'them'}, will be deleted.
                  </span>
                )}
              </Stack>
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            This does not ban them: signing in again with the same email starts a new, empty account.
          </Typography>

          <TextField
            label="Type the user's email to confirm"
            placeholder={user.email}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            fullWidth
          />
        </Stack>
      )}
    </AppDialog>
  )
}

export default DeleteUserDialog
