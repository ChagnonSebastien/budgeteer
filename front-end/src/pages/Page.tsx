import {IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar} from '@ionic/react';
import {useParams} from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import './Page.css';
import ImportSpreadsheet from '../components/ImportSpreadsheet';
import {FC} from "react";

const Page: FC = () => {

  const { name } = useParams<{ name: string; }>();

  let displayedPage = <ExploreContainer name={name}/>;
  if (name == "import") {
    displayedPage = <ImportSpreadsheet />
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{name}</IonTitle>
          </IonToolbar>
        </IonHeader>
        {displayedPage}
      </IonContent>
    </IonPage>
  );
};

export default Page;
