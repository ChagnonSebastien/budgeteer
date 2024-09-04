import { IonPage } from '@ionic/react'
import { FC } from 'react'

import AccountsBalanceChart from '../components/AccountsBalanceChart'
import ContentWithHeader from '../components/ContentWithHeader'
import useTransactionFilter from '../components/useTransactionFilter'

const AccountsBalancePage: FC = () => {
  const { fromDate, toDate, accountFilter, overview: filterOverview } = useTransactionFilter()

  return (
    <IonPage>
      <ContentWithHeader title="Transactions" button="menu">
        <div style={{ height: '50%', width: '100%', position: 'relative', padding: '1rem' }}>
          <AccountsBalanceChart
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : [accountFilter]}
          />
        </div>

        {filterOverview}
      </ContentWithHeader>
    </IonPage>
  )
}

export default AccountsBalancePage
