import { IonInput, IonModal } from "@ionic/react"
import { FC, useContext, useMemo, useState } from "react"
import { AccountServiceContext } from "../service/ServiceContext"
import { AccountList } from "./AccountList"
import ContentWithHeader from "./ContentWithHeader"

interface Props {
  selectedAccountId?: number,
  setSelectedAccountId: (id: number) => void,
  labelText: string
}

const AccountPicker: FC<Props> = (props) => {
  const {selectedAccountId, setSelectedAccountId, labelText} = props
  const {state: accounts} = useContext(AccountServiceContext)
  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <IonInput type="text"
                label={labelText}
                labelPlacement="stacked"
                placeholder={"None"}
                value={selectedAccount?.name}
                onFocus={e => {
                  e.target.blur()
                  setShowModal(true)
                }}
      />
      <IonModal isOpen={showModal}
                onWillDismiss={() => setShowModal(false)}>
        <ContentWithHeader title="Select Icon" button="return"
                           onCancel={() => setShowModal(false)}>
          <AccountList
            accounts={accounts}
            onSelect={newParent => {
              setSelectedAccountId(newParent)
              setShowModal(false)
            }}
          />
        </ContentWithHeader>
      </IonModal>
    </>
  )
}

export default AccountPicker