import {
  IonContent,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
} from '@ionic/react';

import { useLocation } from 'react-router-dom';
import { BiSolidFileImport } from "react-icons/bi";
import { TbArrowsExchange } from "react-icons/tb";
import { MdCategory } from "react-icons/md";
import { BsCurrencyExchange } from "react-icons/bs";
import './Menu.css';
import { IconType } from 'react-icons';

interface AppPage {
  title: string;
  url: string;
  icon: IconType;
}

const appPages: AppPage[] = [
  { 
    title: 'Transactions',
    url: '/transactions',
    icon: (IconBaseProps) => <TbArrowsExchange {...IconBaseProps} />,
  },
  {
    title: 'Categories',
    url: '/categories',
    icon: (IconBaseProps) => <MdCategory     {...IconBaseProps} />,
  },
  {
    title: 'Currencies',
    url: '/currencies',
    icon: (IconBaseProps) => <BsCurrencyExchange {...IconBaseProps} />,
  },
  {
    title: 'Import',
    url: '/import',
    icon: (IconBaseProps) => <BiSolidFileImport {...IconBaseProps} />,
  },
];

const Menu: React.FC = () => {
  const location = useLocation();

  const iconStyle = {margin: '0.5rem'}

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Budget App</IonListHeader>
          <IonNote>hi@ionicframework.com</IonNote>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  {appPage.icon({style: iconStyle})}
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
