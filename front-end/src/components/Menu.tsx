import { IonMenu, useIonRouter } from '@ionic/react'
import { Button, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material'
import { FC, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import './Menu.css'

import { IconToolsContext } from './IconTools'
import { UserContext } from '../App'

interface AppPage {
  title: string
  url: string
  iconName: string
}

const appPages: AppPage[] = [
  {
    title: 'Transactions',
    url: '/transactions',
    iconName: 'TbArrowsExchange',
  },
  {
    title: 'Categories',
    url: '/categories',
    iconName: 'MdCategory',
  },
  {
    title: 'Accounts',
    url: '/accounts',
    iconName: 'MdAccountBalance',
  },
  {
    title: 'Account Balances',
    url: '/accounts/graph',
    iconName: 'MdAccountBalance',
  },
  {
    title: 'Currencies',
    url: '/currencies',
    iconName: 'BsCurrencyExchange',
  },
  {
    title: 'Import',
    url: '/import',
    iconName: 'BiSolidFileImport',
  },
  {
    title: 'Costs Analysis',
    url: '/costs',
    iconName: 'BiSolidFileImport',
  },
]

interface Props {
  logout(): void
}

const Menu: FC<Props> = ({ logout }) => {
  const location = useLocation()
  const router = useIonRouter()

  const { email } = useContext(UserContext)
  const { iconTypeFromName } = useContext(IconToolsContext)

  const iconStyle = { margin: '0.5rem' }

  return (
    <IonMenu contentId="main" type="overlay">
      <List>
        <Typography variant="h6">Budget App</Typography>
        <Typography color="grey">{email}</Typography>
        {appPages.map((appPage, index) => {
          const Icon = iconTypeFromName(appPage.iconName)
          return (
            <ListItemButton
              key={index}
              onClick={() => router.push(appPage.url)}
              selected={location.pathname === appPage.url}
            >
              <ListItemIcon>
                <Icon style={iconStyle} />
              </ListItemIcon>
              <ListItemText>{appPage.title}</ListItemText>
            </ListItemButton>
          )
        })}
        <Button onClick={logout}>Logout</Button>
      </List>
    </IonMenu>
  )
}

export default Menu
