import { IonButton, IonContent, IonInput, IonModal, IonToast } from '@ionic/react'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Omit } from 'react-router'

import CategoryPicker from './CategoryPicker'
import ContentWithHeader from './ContentWithHeader'
import IconCapsule from './IconCapsule'
import IconList from './IconList'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

const contentHeight = window.innerHeight / 3

interface Props {
  initialCategory?: Category
  onSubmit: (data: Omit<Category, 'id'>) => Promise<void>
  submitText: string
}

const CategoryForm: FC<Props> = (props) => {
  const { initialCategory, onSubmit, submitText } = props

  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)

  const editingRoot = useMemo(() => initialCategory?.id === rootCategory.id, [initialCategory, rootCategory])

  const [name, setName] = useState(initialCategory?.name ?? '')
  const [parent, setParent] = useState<number>(initialCategory?.parentId ?? rootCategory.id)
  const [selectedIcon, setSelectedIcon] = useState<string>(initialCategory?.iconName ?? 'FaQuestion')
  const [innerColor, setInnerColor] = useState(initialCategory?.iconColor ?? '#2F4F4F')
  const [outerColor, setOuterColor] = useState(initialCategory?.iconBackground ?? '#FFA500')

  const [filter, setFilter] = useState<string>('')
  const [showIconModal, setShowIconModal] = useState(false)
  const [showInnerColorModal, setShowInnerColorModal] = useState(false)
  const [showOuterColorModal, setShowOuterColorModal] = useState(false)

  const [showErrorToast, setShowErrorToast] = useState('')
  const [errors, setErrors] = useState<{ categoryName?: string }>({})
  const [isTouched, setIsTouched] = useState(false)

  function onIconSelect(newIconName: string) {
    setSelectedIcon(newIconName)
    setFilter('')
    setShowIconModal(false)
  }

  const validateCategoryName = useCallback(
    (categoryName: string) => {
      if (!categoryName) {
        return 'Amount is required'
      }

      if (categories?.find((c) => c.id !== initialCategory?.id && c.name === categoryName)) {
        return 'Name is already being used'
      }

      return undefined
    },
    [categories],
  )

  useEffect(() => {
    setErrors((prevState) => ({
      ...prevState,
      accountName: validateCategoryName(name),
    }))
  }, [validateCategoryName, name])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (Object.values(errors).some((value) => typeof value !== 'undefined')) {
      setIsTouched(true)
      return
    }

    onSubmit({
      name,
      iconName: selectedIcon,
      parentId: initialCategory?.id === rootCategory.id ? null : parent!,
      iconBackground: outerColor,
      iconColor: innerColor,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while creating the category')
      console.error(err)
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div style={{ margin: '1rem' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>Form</div>
          <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
        </div>
        <div style={{ padding: '1rem', border: '1px grey solid', borderTop: 0 }}>
          <IonInput
            type="text"
            className={`${errors.categoryName && 'ion-invalid'} ${isTouched && 'ion-touched'}`}
            label="Account name"
            labelPlacement="stacked"
            placeholder="e.g., Groceries"
            value={name}
            onIonInput={(ev) => {
              setName(ev.target.value as string)
              setErrors({ categoryName: validateCategoryName(ev.target.value as string) })
            }}
            errorText={errors.categoryName}
            onIonBlur={() => setIsTouched(true)}
          />

          {!editingRoot && <CategoryPicker categoryId={parent} setCategoryId={setParent} labelText="Parent Category" />}

          <div style={{ display: 'flex', marginTop: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <IonButton onClick={() => setShowIconModal(true)} expand="block" style={{ flexGrow: 1 }} fill="outline">
                  Select Icon
                </IonButton>
                <div style={{ width: '1rem', flexShrink: 0 }} />
                <IconCapsule
                  iconName={selectedIcon}
                  size="2rem"
                  backgroundColor="transparent"
                  color="gray"
                  border="1px gray solid"
                  flexShrink={0}
                />
              </div>
              <IonModal isOpen={showIconModal} onWillDismiss={() => setShowIconModal(false)}>
                <ContentWithHeader
                  title="Select Icon"
                  button="return"
                  onSearch={setFilter}
                  onCancel={() => setShowIconModal(false)}
                >
                  <IconList filter={filter} onSelect={onIconSelect} />
                </ContentWithHeader>
              </IonModal>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <IonButton
                  onClick={() => setShowOuterColorModal(true)}
                  expand="block"
                  style={{ flexGrow: 1 }}
                  fill="outline"
                >
                  Select Outer Color
                </IonButton>
                <div style={{ width: '1rem', flexShrink: 0 }} />
                <IconCapsule
                  iconName="GrX"
                  size="2rem"
                  backgroundColor={outerColor}
                  color="transparent"
                  border="1px gray solid"
                  flexShrink={0}
                />
              </div>
              <IonModal
                onWillDismiss={() => setShowOuterColorModal(false)}
                initialBreakpoint={contentHeight / window.innerHeight}
                breakpoints={[0, contentHeight / window.innerHeight]}
                isOpen={showOuterColorModal}
              >
                <IonContent>
                  <HexColorPicker
                    color={outerColor}
                    onChange={setOuterColor}
                    style={{ width: '100%', flexGrow: 1, height: contentHeight }}
                  />
                </IonContent>
              </IonModal>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <IonButton
                  onClick={() => setShowInnerColorModal(true)}
                  expand="block"
                  style={{ flexGrow: 1 }}
                  fill="outline"
                >
                  Select Inner Color
                </IonButton>
                <div style={{ width: '1rem', flexShrink: 0 }} />
                <IconCapsule
                  iconName="GrX"
                  size="2rem"
                  backgroundColor={innerColor}
                  color="transparent"
                  border="1px gray solid"
                  flexShrink={0}
                />
              </div>
              <IonModal
                onWillDismiss={() => setShowInnerColorModal(false)}
                initialBreakpoint={contentHeight / window.innerHeight}
                breakpoints={[0, contentHeight / window.innerHeight]}
                isOpen={showInnerColorModal}
              >
                <IonContent>
                  <HexColorPicker
                    color={innerColor}
                    onChange={setInnerColor}
                    style={{ width: '100%', flexGrow: 1, height: contentHeight }}
                  />
                </IonContent>
              </IonModal>
            </div>
            <div style={{ width: '1rem', flexShrink: 0 }} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '1rem',
                border: '1px gray solid',
              }}
            >
              <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor} />
            </div>
          </div>
        </div>
        <div style={{ height: '1rem' }} />
        <IonButton type="submit" expand="block">
          {submitText}
        </IonButton>
      </div>

      <IonToast
        isOpen={showErrorToast !== ''}
        message={showErrorToast}
        duration={5000}
        onDidDismiss={() => setShowErrorToast('')}
      />
    </form>
  )
}

export default CategoryForm
