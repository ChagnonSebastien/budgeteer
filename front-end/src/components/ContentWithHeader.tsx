import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { FC, ReactNode } from 'react'

interface Props {
  children: ReactNode | ReactNode[]
  title: string
  button: 'menu' | 'return' | 'none'
  onSearch?: (query: string) => void
  onCancel?: () => void
  segments?: JSX.Element
}

const ContentWithHeader: FC<Props> = (props) => {
  const { title, children, button: buttonOption, onSearch, onCancel, segments } = props
  let button = null
  switch (buttonOption) {
    case 'return':
      button = <IonBackButton />
      break
    case 'menu':
      button = <IonMenuButton />
      break
  }

  return (
    <>
      <IonHeader translucent>
        <IonToolbar>
          {buttonOption !== 'none' && (
            <IonButtons collapse slot="start">
              {button}
            </IonButtons>
          )}
          {typeof onCancel !== 'undefined' && (
            <IonButtons collapse slot="start">
              <IonButton onClick={onCancel}>Cancel</IonButton>
            </IonButtons>
          )}
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
        {typeof onSearch !== 'undefined' && (
          <IonToolbar>
            <IonSearchbar onIonInput={(event) => onSearch(event.target.value ?? '')} />
          </IonToolbar>
        )}
        {typeof segments !== 'undefined' && <IonToolbar>{segments}</IonToolbar>}
      </IonHeader>

      <IonContent fullscreen fixedSlotPlacement="before">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonButtons collapse slot="start">
              {button}
            </IonButtons>
            <IonTitle size="large">{title}</IonTitle>
          </IonToolbar>
        </IonHeader>

        {children}
      </IonContent>
    </>
  )
}

export default ContentWithHeader
