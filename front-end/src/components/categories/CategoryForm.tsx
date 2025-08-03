import { Button, Checkbox, FormControlLabel, TextField } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { default as styled } from 'styled-components'

import CategoryPicker from './CategoryPicker'
import Category from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import IconCapsule, { IconProperties } from '../icons/IconCapsule'
import IconList from '../icons/IconList'
import { IconToolsContext } from '../icons/IconTools'
import ContentDialog from '../shared/ContentDialog'
import ContentWithHeader from '../shared/ContentWithHeader'
import FormWrapper from '../shared/FormWrapper'
import { Column, Row } from '../shared/NoteContainer'
import { CustomScrollbarContainer } from '../shared/ScrollingOverButton'

const SizedHexColorPicker = styled(HexColorPicker)`
  &.react-colorful {
    width: min(30rem, calc(100vw / 2));
    height: min(30rem, calc(100vh / 2));
  }
`

type IconPropertyEditorProps = {
  buttonText: string
  onClick(): void
  indicatorIconProperties: IconProperties
}

const IconPropertyEditor: FC<IconPropertyEditorProps> = (props) => (
  <Row style={{ gap: '1rem' }}>
    <Button onClick={props.onClick} variant="outlined" color="secondary" fullWidth>
      {props.buttonText}
    </Button>
    <IconCapsule size="2rem" border="1px gray solid" {...props.indicatorIconProperties} />
  </Row>
)

interface Props {
  initialCategory?: Category
  onSubmit: (data: Partial<Omit<Category, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
}

const CategoryForm: FC<Props> = (props) => {
  const { initialCategory, onSubmit, submitText } = props

  const { state: categories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const { IconLib } = useContext(IconToolsContext)

  const editingRoot = useMemo(() => initialCategory?.id === rootCategory.id, [initialCategory, rootCategory])

  const [name, setName] = useState(initialCategory?.name ?? '')
  const [parent, setParent] = useState<number>(initialCategory?.parentId ?? rootCategory.id)
  const [selectedIcon, setSelectedIcon] = useState<string>(initialCategory?.iconName ?? 'FaQuestion')
  const [innerColor, setInnerColor] = useState(initialCategory?.iconColor ?? '#2F4F4F')
  const [outerColor, setOuterColor] = useState(initialCategory?.iconBackground ?? '#FFA500')
  const [fixedCost, setFixedCost] = useState(initialCategory?.fixedCosts ?? false)

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

  const isFormValid = useMemo(() => {
    return !Object.values(errors).some((value) => typeof value !== 'undefined')
  }, [errors])

  const handleSubmit = (_e: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      setIsTouched(true)
      return
    }

    onSubmit({
      name,
      iconName: selectedIcon,
      parentId: initialCategory?.id === rootCategory.id ? null : parent!,
      iconBackground: outerColor,
      iconColor: innerColor,
      fixedCosts: fixedCost,
      ordering: initialCategory?.ordering ?? 0,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting the category')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} isValid={isFormValid} errorMessage={showErrorToast}>
      <TextField
        type="text"
        label="Account name"
        variant="standard"
        placeholder="e.g., Groceries"
        value={name}
        onChange={(ev) => {
          setName(ev.target.value as string)
          setErrors({ categoryName: validateCategoryName(ev.target.value as string) })
        }}
        helperText={isTouched ? errors.categoryName : ''}
        error={isTouched && !!errors.categoryName}
        onBlur={() => setIsTouched(true)}
      />

      {!editingRoot && (
        <CategoryPicker
          selectedConfig={{
            mode: 'single',
            selectedItem: parent,
            onSelectItem: setParent,
          }}
          labelText="Parent Category"
        />
      )}

      <FormControlLabel
        control={<Checkbox checked={fixedCost} onChange={(ev) => setFixedCost(ev.target.checked)} />}
        label="Is a fixed cost"
      />

      <Row style={{ alignItems: 'center', gap: '1rem' }}>
        <Column style={{ gap: '0.25rem', flexGrow: 1 }}>
          <IconPropertyEditor
            buttonText="Select Icon"
            onClick={() => setShowIconModal(true)}
            indicatorIconProperties={{
              iconName: selectedIcon,
              color: 'gray',
              backgroundColor: 'transparent',
            }}
          />

          <IconPropertyEditor
            buttonText="Select Outer Color"
            onClick={() => setShowOuterColorModal(true)}
            indicatorIconProperties={{
              iconName: 'GrX',
              color: 'transparent',
              backgroundColor: outerColor,
            }}
          />

          <IconPropertyEditor
            buttonText="Select Inner Color"
            onClick={() => setShowInnerColorModal(true)}
            indicatorIconProperties={{
              iconName: 'GrX',
              color: 'transparent',
              backgroundColor: innerColor,
            }}
          />
        </Column>
        <ContentDialog open={showIconModal} onClose={() => setShowIconModal(false)}>
          <ContentWithHeader
            title="Select Icon"
            withPadding
            action={{ Icon: IconLib.MdKeyboardBackspace, onClick: () => setShowIconModal(false) }}
          >
            <TextField
              onChange={(event) => setFilter(event.target.value ?? '')}
              variant="standard"
              placeholder="Search..."
              autoFocus
              fullWidth
            />
            <CustomScrollbarContainer style={{ maxHeight: 'calc(100vh - 15rem)' }}>
              <IconList filter={filter} onSelect={onIconSelect} />
            </CustomScrollbarContainer>
          </ContentWithHeader>
        </ContentDialog>
        <ContentDialog onClose={() => setShowOuterColorModal(false)} open={showOuterColorModal}>
          <ContentWithHeader
            title="Select Outer Color"
            action={{ Icon: IconLib.MdKeyboardBackspace, onClick: () => setShowOuterColorModal(false) }}
          >
            <SizedHexColorPicker color={outerColor} onChange={setOuterColor} />
          </ContentWithHeader>
        </ContentDialog>
        <ContentDialog onClose={() => setShowInnerColorModal(false)} open={showInnerColorModal}>
          <ContentWithHeader
            title="Select Inner Color"
            action={{ Icon: IconLib.MdKeyboardBackspace, onClick: () => setShowInnerColorModal(false) }}
          >
            <SizedHexColorPicker color={innerColor} onChange={setInnerColor} />
          </ContentWithHeader>
        </ContentDialog>
        <div style={{ padding: '1rem', border: '2px solid grey', borderRadius: '0.5rem' }}>
          <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor} />
        </div>
      </Row>
    </FormWrapper>
  )
}

export default CategoryForm
