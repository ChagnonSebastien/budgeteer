import { IonButton, IonPage, useIonRouter } from '@ionic/react'
import { FC, useContext } from 'react'

import { AccountList } from '../components/AccountList'
import { AccountServiceContext } from '../service/ServiceContext'

const AccountsPage: FC = () => {
  const router = useIonRouter()

  const { state: accounts } = useContext(AccountServiceContext)

  return (
    <IonPage>
      <AccountList
        accounts={accounts}
        onSelect={(id) => router.push(`/accounts/edit/${id}`)}
        showBalances
        title="Accounts"
        button="return"
      />
      <div style={{ height: '1rem' }} />
      <IonButton expand="block" onClick={() => router.push('/accounts/new')}>
        New
      </IonButton>
    </IonPage>
  )
}

export default AccountsPage
