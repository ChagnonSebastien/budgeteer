import {
  IonButton, IonContent, IonInput,
  IonModal,
  IonPage,
} from "@ionic/react"
import { HexColorPicker } from "react-colorful"
import { FC, FormEvent, useContext, useEffect, useRef, useState } from "react"
import { CategoryList } from "../components/CategoryList"
import IconCapsule from "../components/IconCapsule"
import IconList from "../components/IconList"
import ContentWithHeader from "../components/ContentWithHeader"
import Category from "../domain/model/category"
import { CategoryRepositoryContext } from "../service/RepositoryContexts"
import { DataType } from "csstype"

const contentHeight = window.innerHeight / 3

const CreateCategoryPage: FC = () => {
  const parentModal = useRef<HTMLIonModalElement>(null)
  const iconModal = useRef<HTMLIonModalElement>(null)
  const innerColorModal = useRef<HTMLIonModalElement>(null)
  const outerColorModal = useRef<HTMLIonModalElement>(null)
  const categoryRepository = useContext(CategoryRepositoryContext)
  const [filter, setFilter] = useState<string>("")
  const [categories, setCategories] = useState<Category[]>()

  const [name, setName] = useState("")
  const [parent, setParent] = useState<number>()
  const [selectedIcon, setSelectedIcon] = useState<string>("FaQuestion")
  const [innerColor, setInnerColor] = useState<DataType.Color>("#2F4F4F")
  const [outerColor, setOuterColor] = useState<DataType.Color>("#FFA500")

  const [errors, setErrors] = useState<{categoryName?: string}>({})
  const [isTouched, setIsTouched] = useState(false)

  useEffect(() => {
    categoryRepository.getAll().then(setCategories)
  }, [categoryRepository.getAll])

  function onIconSelect(newIconName: string) {
    console.log(newIconName)
    setSelectedIcon(newIconName)
    setFilter("")
    iconModal.current?.dismiss()
  }

  const validateCategoryName = (categoryName: string) => {
    if (!categoryName) {
      return "Category is required"
    }

    if (categories?.find(c => c.name === categoryName)) {
      return "Name is already being used"
    }

    return ""
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const categoryNameErr = validateCategoryName(name)


    if (categoryNameErr) {
      setErrors({categoryName: categoryNameErr})
      return
    }

    setErrors({})
    console.log("Form submitted:", {name})
  }

  return (
    <IonPage>
      <ContentWithHeader title="Create new category" button="return">

        <form noValidate onSubmit={handleSubmit}>
          <div style={{margin: "1rem"}}>
            <div style={{display: "flex"}}>
              <div style={{color: "gray", margin: "0 1rem", transform: "translate(0, 0.5rem)"}}>Form</div>
              <div style={{borderBottom: "1px grey solid", flexGrow: 1}}/>
            </div>
            <div style={{padding: "1rem", border: "1px grey solid", borderTop: 0}}>
              <IonInput type="text"
                        className={`${!errors.categoryName && "ion-valid"} ${errors.categoryName && "ion-invalid"} ${isTouched && "ion-touched"}`}
                        label="Category name"
                        labelPlacement="stacked"
                        placeholder="e.g., Groceries"
                        value={name}
                        onIonChange={ev => setName(ev.target.value as string)}
                        errorText={errors.categoryName}
                        onIonBlur={() => setIsTouched(true)}
              />
              <IonInput type="text"
                        label="Parent category"
                        labelPlacement="stacked"
                        value={categories?.find(c => c.id == parent)?.name ?? "ERROR"}
                        onIonChange={ev => setName(ev.target.value as string)}
                        onFocus={() => parentModal.current?.present()}
                        required
              />
              <div style={{display: "flex", marginTop: "1rem", alignItems: "center"}}>
                <div style={{display: "flex", flexDirection: "column", flexGrow: 1}}>
                  <div style={{display: "flex", alignItems: "center"}}>
                    <IonButton id="open-select-icon-modal" expand="block" style={{flexGrow: 1}} fill="outline">
                      Select Icon
                    </IonButton>
                    <div style={{width: "1rem", flexShrink: 0}}/>
                    <IconCapsule iconName={selectedIcon} size="2rem" backgroundColor="transparent"
                                 color="darkslategray" border="1px gray solid" flexShrink={0}/>
                  </div>
                  <div style={{display: "flex", alignItems: "center"}}>
                    <IonButton id="open-select-outer-color-modal" expand="block" style={{flexGrow: 1}} fill="outline">
                      Select Outer Color
                    </IonButton>
                    <div style={{width: "1rem", flexShrink: 0}}/>
                    <IconCapsule iconName="GrX" size="2rem" backgroundColor={outerColor}
                                 color="transparent" border="1px gray solid" flexShrink={0}/>
                  </div>
                  <div style={{display: "flex", alignItems: "center"}}>
                    <IonButton id="open-select-inner-color-modal" expand="block" style={{flexGrow: 1}} fill="outline">
                      Select Inner Color
                    </IonButton>
                    <div style={{width: "1rem", flexShrink: 0}}/>
                    <IconCapsule iconName="GrX" size="2rem" backgroundColor={innerColor}
                                 color="transparent" border="1px gray solid" flexShrink={0}/>
                  </div>
                </div>
                <div style={{width: "1rem", flexShrink: 0}}/>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "1rem",
                  border: "2px black solid",
                }}>
                  <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor}/>
                </div>

              </div>
            </div>
            <div style={{height: "1rem"}}/>
            <IonButton type="submit" expand="block">
              Create
            </IonButton>
          </div>
        </form>


        <IonModal ref={parentModal}
                  onWillDismiss={() => parentModal.current?.dismiss()}>
          <ContentWithHeader title="Select Icon" button="return"
                             onCancel={() => parentModal.current?.dismiss()}>
            <CategoryList categories={categories} onSelect={newParent => {
              setParent(newParent)
              parentModal.current?.dismiss()
            }}/>
          </ContentWithHeader>
        </IonModal>
        <IonModal ref={iconModal}
                  trigger="open-select-icon-modal"
                  onWillDismiss={() => iconModal.current?.dismiss()}>
          <ContentWithHeader title="Select Icon" button="return" onSearch={setFilter}
                             onCancel={() => iconModal.current?.dismiss()}>
            <IconList filter={filter} onSelect={onIconSelect}/>
          </ContentWithHeader>
        </IonModal>
        <IonModal ref={innerColorModal}
                  trigger="open-select-inner-color-modal"
                  onWillDismiss={() => innerColorModal.current?.dismiss()}
                  initialBreakpoint={contentHeight / window.innerHeight}
                  breakpoints={[0, contentHeight / window.innerHeight]}
        >
          <IonContent>
            <HexColorPicker color={innerColor} onChange={setInnerColor}
                            style={{width: "100%", flexGrow: 1, height: contentHeight}}
            />
          </IonContent>
        </IonModal>
        <IonModal ref={outerColorModal}
                  trigger="open-select-outer-color-modal"
                  onWillDismiss={() => outerColorModal.current?.dismiss()}
                  initialBreakpoint={contentHeight / window.innerHeight}
                  breakpoints={[0, contentHeight / window.innerHeight]}
        >
          <IonContent>
            <HexColorPicker color={outerColor} onChange={setOuterColor}
                            style={{width: "100%", flexGrow: 1, height: contentHeight}}
            />
          </IonContent>
        </IonModal>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CreateCategoryPage
