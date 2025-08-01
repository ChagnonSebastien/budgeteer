import { Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import CategoryPicker from './CategoryPicker'
import Category from '../../domain/model/category'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext } from '../../service/ServiceContext'
import IconCapsule from '../icons/IconCapsule'
import IconList from '../icons/IconList'
import ContentDialog from '../shared/ContentDialog'
import ContentWithHeader from '../shared/ContentWithHeader'
import FormWrapper from '../shared/FormWrapper'
import { Row } from '../shared/NoteContainer'

interface Props {
  initialCategory?: Category
  onSubmit: (data: Partial<Omit<Category, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
}

const CategoryForm: FC<Props> = (props) => {
  const { initialCategory, onSubmit, submitText } = props

  const { state: categories } = useContext(CategoryServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)

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
        className="w-full"
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

      <div className="flex mt-4 items-center">
        <Stack spacing=".25rem" className="flex flex-col flex-grow">
          <Row style={{ alignItems: 'start' }}>
            <Button onClick={() => setShowIconModal(true)} color="secondary" sx={{ flexGrow: 1 }} variant="outlined">
              Select Icon
            </Button>
            <div style={{ width: '1rem', flexShrink: 0 }} />
            <IconCapsule
              iconName={selectedIcon}
              size="2rem"
              backgroundColor="transparent"
              color="gray"
              border="1px gray solid"
              flexShrink={0}
            />
          </Row>

          <Row style={{ alignItems: 'start' }}>
            <Button
              onClick={() => setShowOuterColorModal(true)}
              className="flex-grow"
              variant="outlined"
              color="secondary"
            >
              Select Outer Color
            </Button>
            <div style={{ width: '1rem', flexShrink: 0 }} />
            <IconCapsule
              iconName="GrX"
              size="2rem"
              backgroundColor={outerColor}
              color="transparent"
              border="1px gray solid"
              flexShrink={0}
            />
          </Row>

          <Row style={{ alignItems: 'start' }}>
            <Button
              onClick={() => setShowInnerColorModal(true)}
              className="flex-grow"
              variant="outlined"
              color="secondary"
            >
              Select Inner Color
            </Button>
            <div style={{ width: '1rem', flexShrink: 0 }} />
            <IconCapsule
              iconName="GrX"
              size="2rem"
              backgroundColor={innerColor}
              color="transparent"
              border="1px gray solid"
              flexShrink={0}
            />
          </Row>
        </Stack>
        <ContentDialog open={showIconModal} onClose={() => setShowIconModal(false)}>
          <ContentWithHeader
            title="Select Icon"
            button="none"
            onSearch={setFilter}
            onCancel={() => setShowIconModal(false)}
          >
            <IconList filter={filter} onSelect={onIconSelect} />
          </ContentWithHeader>
        </ContentDialog>
        <ContentDialog onClose={() => setShowOuterColorModal(false)} open={showOuterColorModal}>
          <HexColorPicker color={outerColor} onChange={setOuterColor} className="flex-grow overflow-hidden" />
        </ContentDialog>
        <ContentDialog onClose={() => setShowInnerColorModal(false)} open={showInnerColorModal}>
          <HexColorPicker color={innerColor} onChange={setInnerColor} className="flex-grow overflow-hidden" />
        </ContentDialog>
        <div style={{ width: '1rem', flexShrink: 0 }} />
        <div className="flex flex-col justify-center p-4 border border-gray-500">
          <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor} />
        </div>
      </div>
    </FormWrapper>
  )
}

export default CategoryForm
