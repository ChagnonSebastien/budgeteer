import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useParams } from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import './Page.css';
import ImportSpreadsheet from '../components/ImportSpreadsheet';

const Page: React.FC = () => {

  const { name } = useParams<{ name: string; }>();

  const importPage = <ImportSpreadsheet />
  const exploreContainer = <ExploreContainer name={name} />

  var displayedPage = exploreContainer
  if (name == "import") {
    displayedPage = importPage
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
