import { FC } from 'react'

import AccountsBalanceChart from '../components/AccountsBalanceChart'
import ContentWithHeader from '../components/ContentWithHeader'
import useTransactionFilter from '../components/useTransactionFilter'

const AccountsBalancePage: FC = () => {
  const { fromDate, toDate, accountFilter, overview: filterOverview } = useTransactionFilter()

  return (
    <ContentWithHeader title="Transactions" button="menu" contentMaxWidth="100%">
      <div style={{ height: '50%', width: '100%', position: 'relative', padding: '1rem 0' }}>
        <AccountsBalanceChart
          fromDate={fromDate}
          toDate={toDate}
          filterByAccounts={accountFilter === null ? undefined : [accountFilter]}
        />
      </div>

      {filterOverview}
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
