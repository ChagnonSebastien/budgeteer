import { Button, Checkbox, FormControlLabel, Stack, TextField } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import CategoryPicker from './CategoryPicker'
import Category from '../../domain/model/category'
import { CategoryServiceContext } from '../../service/ServiceContext'
import ContentDialog from '../ContentDialog'
import ContentWithHeader from '../ContentWithHeader'
import FormWrapper from '../FormWrapper'
import IconCapsule from '../icons/IconCapsule'
import IconList from '../icons/IconList'

interface Props {
  initialCategory?: Category
  onSubmit: (data: Partial<Omit<Category, 'id' | 'hasName'>>) => Promise<void>
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

      {!editingRoot && <CategoryPicker categoryId={parent} setCategoryId={setParent} labelText="Parent Category" />}

      <FormControlLabel
        control={<Checkbox checked={fixedCost} onChange={(ev) => setFixedCost(ev.target.checked)} />}
        label="Is a fixed cost"
      />

      <div className="flex mt-4 items-center">
        <Stack spacing=".25rem" className="flex flex-col flex-grow">
          <div className="form-row">
            <Button onClick={() => setShowIconModal(true)} color="secondary" sx={{ flexGrow: 1 }} variant="outlined">
              Select Icon
            </Button>
            <div className="form-field-spacer-horizontal" />
            <IconCapsule
              iconName={selectedIcon}
              size="2rem"
              backgroundColor="transparent"
              color="gray"
              border="1px gray solid"
              flexShrink={0}
            />
          </div>

          <div className="form-row">
            <Button
              onClick={() => setShowOuterColorModal(true)}
              className="flex-grow"
              variant="outlined"
              color="secondary"
            >
              Select Outer Color
            </Button>
            <div className="form-field-spacer-horizontal" />
            <IconCapsule
              iconName="GrX"
              size="2rem"
              backgroundColor={outerColor}
              color="transparent"
              border="1px gray solid"
              flexShrink={0}
            />
          </div>

          <div className="form-row">
            <Button
              onClick={() => setShowInnerColorModal(true)}
              className="flex-grow"
              variant="outlined"
              color="secondary"
            >
              Select Inner Color
            </Button>
            <div className="form-field-spacer-horizontal" />
            <IconCapsule
              iconName="GrX"
              size="2rem"
              backgroundColor={innerColor}
              color="transparent"
              border="1px gray solid"
              flexShrink={0}
            />
          </div>
        </Stack>
        <ContentDialog open={showIconModal} onClose={() => setShowIconModal(false)}>
          <ContentWithHeader
            title="Select Icon"
            button="return"
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
        <div className="form-field-spacer-horizontal" />
        <div className="flex flex-col justify-center p-4 border border-gray-500">
          <IconCapsule iconName={selectedIcon} size="5rem" color={innerColor} backgroundColor={outerColor} />
        </div>
      </div>
    </FormWrapper>
  )
}

export default CategoryForm
