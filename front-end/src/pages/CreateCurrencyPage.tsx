import { IonPage, useIonRouter } from '@ionic/react'
import { FC, useCallback, useContext } from 'react'

import ContentWithHeader from '../components/ContentWithHeader'
import CurrencyForm from '../components/CurrencyForm'
import Currency from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

const CreateCurrencyPage: FC = () => {
  const router = useIonRouter()

  const { create: createCurrency } = useContext(CurrencyServiceContext)

  const onSubmit = useCallback(async (data: Omit<Currency, 'id'>) => {
    await createCurrency(data)
    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push('/currency', 'back', 'replace')
    }
  }, [])

  return (
    <IonPage>
      <ContentWithHeader title="Create new currency" button="return">
        <div style={{ padding: '1rem' }}>
          <CurrencyForm onSubmit={onSubmit} submitText="Create" />
        </div>
      </ContentWithHeader>
    </IonPage>
  )
}

export default CreateCurrencyPage
