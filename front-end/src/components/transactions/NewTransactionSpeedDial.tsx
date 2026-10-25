import { FC, useContext } from 'react'
import { useLocation } from 'react-router-dom'

import { useTransactionTypeOptions } from './TransactionTypeChoice'
import { IconToolsContext } from '../icons/IconTools'
import ActionSpeedDial, { DialAction } from '../shared/ActionSpeedDial'
import { useNavigateFromDialog } from '../shared/useCloseOnBack'

const NewTransactionSpeedDial: FC<{ hint?: string; prefillAccountId?: number | null }> = ({
  hint,
  prefillAccountId = null,
}) => {
  const navigate = useNavigateFromDialog()
  const location = useLocation()
  const currentUrl = `${location.pathname}${location.search}`
  const { IconLib } = useContext(IconToolsContext)
  const transactionTypeOptions = useTransactionTypeOptions()

  return (
    <ActionSpeedDial
      ariaLabel="Create new transaction"
      hint={hint}
      actions={[
        ...transactionTypeOptions.map(
          ({ label, type, Icon, color }): DialAction => ({
            label,
            Icon,
            color,
            onClick: () =>
              navigate(`/transactions/new?type=${type}`, { state: { from: currentUrl, prefillAccountId } }),
          }),
        ),
        {
          label: 'Import CSV',
          Icon: IconLib.FaFileImport,
          color: 'primary.main',
          onClick: () => navigate('/transactions/import', { state: { prefillAccountId } }),
        },
      ]}
    />
  )
}

export default NewTransactionSpeedDial
