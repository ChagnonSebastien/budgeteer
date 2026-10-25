import { Tab, Tabs } from '@mui/material'
import { FC, useState } from 'react'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import { PageBody } from '../components/shared/Layout'
import UsersTab from '../components/users/UsersTab'

const AdministrationPage: FC = () => {
  const [filter, setFilter] = useState('')

  return (
    <ContentWithHeader
      title="Administration"
      action="menu"
      withPadding
      search={{ value: filter, onChange: setFilter, placeholder: 'Search users...' }}
    >
      <PageBody>
        <Tabs value="users">
          <Tab label="Users" value="users" />
        </Tabs>

        <UsersTab filter={filter} />
      </PageBody>
    </ContentWithHeader>
  )
}

export default AdministrationPage
