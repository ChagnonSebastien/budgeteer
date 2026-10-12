import { Box, Chip, Divider, IconButton, Stack, Typography } from '@mui/material'
import { formatDistanceToNow } from 'date-fns'
import { FC, Fragment, useContext, useEffect, useState } from 'react'

import { IconToolsContext } from '../components/icons/IconTools'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Centered, PageBody } from '../components/shared/Layout'
import DeleteUserDialog from '../components/users/DeleteUserDialog'
import { ManagedUser } from '../domain/model/user'
import { UserStoreContext } from '../service/ServiceContext'

const loginMethodLabels: Record<NonNullable<ManagedUser['loginMethod']>, string> = {
  oidc: 'OIDC',
}

const UserRow: FC<{ user: ManagedUser; onDelete(): void }> = ({ user, onDelete }) => {
  const { IconLib } = useContext(IconToolsContext)
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ py: 1.5 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography noWrap>{user.name}</Typography>
        <Typography variant="body2" color="text.disabled" noWrap title={user.email}>
          {user.email}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
        {user.isAdmin && <Chip size="small" color="primary" label="Admin" />}
        {user.loginMethod ? (
          <Chip size="small" variant="outlined" label={`Full account · ${loginMethodLabels[user.loginMethod]}`} />
        ) : (
          <Chip size="small" variant="outlined" label="Guest" />
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          title={user.lastSeenAt?.toLocaleString()}
          sx={{ minWidth: 120, textAlign: { sm: 'right' } }}
        >
          {user.lastSeenAt ? formatDistanceToNow(user.lastSeenAt, { addSuffix: true }) : 'Never seen'}
        </Typography>
        <IconButton
          size="small"
          color="error"
          aria-label={`delete ${user.email}`}
          title={user.isAdmin ? 'Admins cannot be deleted' : 'Delete user'}
          disabled={user.isAdmin}
          onClick={onDelete}
        >
          <IconLib.MdDelete />
        </IconButton>
      </Stack>
    </Stack>
  )
}

const UsersPage: FC = () => {
  const userStore = useContext(UserStoreContext)
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('')
  const [toDelete, setToDelete] = useState<ManagedUser | null>(null)

  useEffect(() => {
    userStore
      ?.getAll()
      .then(setUsers)
      .catch((e) => {
        console.error(e)
        setError(true)
      })
  }, [userStore])

  const needle = filter.trim().toLowerCase()
  const shown = (users ?? []).filter(
    (u) => !needle || u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle),
  )

  return (
    <ContentWithHeader
      title="Users"
      action="menu"
      withPadding
      search={{ value: filter, onChange: setFilter, placeholder: 'Search users...' }}
    >
      {error ? (
        <Centered>Could not load users</Centered>
      ) : users === null ? (
        <LoadingScreen />
      ) : (
        <PageBody>
          <Typography variant="label" color="text.disabled">
            {shown.length} of {users.length} users
          </Typography>
          <Box>
            {shown.map((user, i) => (
              <Fragment key={user.id}>
                {i > 0 && <Divider />}
                <UserRow user={user} onDelete={() => setToDelete(user)} />
              </Fragment>
            ))}
          </Box>
        </PageBody>
      )}
      {toDelete && (
        <DeleteUserDialog
          user={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => {
            setUsers((current) => current?.filter((u) => u.id !== toDelete.id) ?? null)
            setToDelete(null)
          }}
        />
      )}
    </ContentWithHeader>
  )
}

export default UsersPage
