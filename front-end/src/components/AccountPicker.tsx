import { IonInput, IonModal } from '@ionic/react'
import { CSSProperties, FC, useContext, useMemo, useState } from 'react'

import { AccountList } from './AccountList'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  selectedAccountId: number | null
  setSelectedAccountId: (id: number) => void
  labelText: string
  style?: CSSProperties
  className?: string
  errorText?: string
  myOwn: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const { selectedAccountId, setSelectedAccountId, labelText, style, className, errorText, myOwn } = props
  const { myOwnAccounts, otherAccounts } = useContext(AccountServiceContext)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])
  const selectedAccount = useMemo(() => accounts.find((a) => a.id === selectedAccountId), [accounts, selectedAccountId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <IonInput
        className={className}
        style={style}
        errorText={errorText}
        type="text"
        label={labelText}
        labelPlacement="stacked"
        placeholder={'None'}
        value={selectedAccount?.name}
        onFocus={(e) => {
          e.target.blur()
          setShowModal(true)
        }}
      />
      <IonModal isOpen={showModal} onWillDismiss={() => setShowModal(false)}>
        <AccountList
          title={`Select ${labelText}`}
          accounts={accounts}
          onSelect={(newParent) => {
            setSelectedAccountId(newParent)
            setShowModal(false)
          }}
          button="none"
        />
      </IonModal>
    </>
  )
}

export default AccountPicker
