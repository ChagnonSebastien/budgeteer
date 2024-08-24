import { IonInput, IonModal } from "@ionic/react"
import { StyleReactProps } from "@ionic/react/dist/types/components/react-component-lib/interfaces"
import { FC, useContext, useMemo, useState } from "react"
import { AccountServiceContext } from "../service/ServiceContext"
import { AccountList } from "./AccountList"
import ContentWithHeader from "./ContentWithHeader"

interface Props {
  selectedAccountId: number | null,
  setSelectedAccountId: (id: number) => void,
  labelText: string,
  style?: StyleReactProps,
  errorText?: string,
  myOwn: boolean
}

const AccountPicker: FC<Props> = (props) => {
  const {selectedAccountId, setSelectedAccountId, labelText, style, errorText, myOwn} = props
  const {myOwnAccounts, otherAccounts} = useContext(AccountServiceContext)
  const accounts = useMemo(() => {
    return myOwn ? myOwnAccounts : otherAccounts
  }, [myOwn, myOwnAccounts, otherAccounts])
  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId])

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <IonInput {...style}
                errorText={errorText}
                type="text"
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
        <ContentWithHeader title={`Select ${labelText}`} button="return"
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