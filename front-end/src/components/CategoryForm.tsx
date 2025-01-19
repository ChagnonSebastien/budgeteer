import { Button, Checkbox, Dialog, FormControlLabel, Snackbar, Stack, TextField } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

import CategoryPicker from './CategoryPicker'
import ContentWithHeader from './ContentWithHeader'
import IconCapsule from './IconCapsule'
import IconList from './IconList'
import Category from '../domain/model/category'
import { CategoryServiceContext } from '../service/ServiceContext'

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
      fixedCosts: fixedCost,
      ordering: initialCategory?.ordering ?? 0,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting the category')
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
        <Stack spacing="1rem" style={{ padding: '2rem 1rem', border: '1px grey solid', borderTop: 0 }}>
          <TextField
            type="text"
            label="Account name"
            variant="standard"
            placeholder="e.g., Groceries"
            value={name}
            style={{ width: '100%' }}
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
            control={<Checkbox onChange={(ev) => setFixedCost(ev.target.checked)} />}
            label="Is a fixed cost"
          />

          <div style={{ display: 'flex', marginTop: '1rem', alignItems: 'center' }}>
            <Stack spacing=".25rem" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  onClick={() => setShowIconModal(true)}
                  color="secondary"
                  sx={{ flexGrow: 1 }}
                  variant="outlined"
                >
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
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  onClick={() => setShowOuterColorModal(true)}
                  style={{ flexGrow: 1 }}
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
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  onClick={() => setShowInnerColorModal(true)}
                  style={{ flexGrow: 1 }}
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
              </div>
            </Stack>
            <Dialog open={showIconModal} onClose={() => setShowIconModal(false)}>
              <ContentWithHeader
                title="Select Icon"
                button="return"
                onSearch={setFilter}
                onCancel={() => setShowIconModal(false)}
              >
                <IconList filter={filter} onSelect={onIconSelect} />
              </ContentWithHeader>
            </Dialog>
            <Dialog onClose={() => setShowOuterColorModal(false)} open={showOuterColorModal}>
              <HexColorPicker color={outerColor} onChange={setOuterColor} style={{ flexGrow: 1, overflow: 'hidden' }} />
            </Dialog>
            <Dialog onClose={() => setShowInnerColorModal(false)} open={showInnerColorModal}>
              <HexColorPicker color={innerColor} onChange={setInnerColor} style={{ flexGrow: 1, overflow: 'hidden' }} />
            </Dialog>
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
        </Stack>
        <div style={{ height: '1rem' }} />
        <Button fullWidth variant="contained" type="submit">
          {submitText}
        </Button>
      </div>

      <Snackbar
        open={showErrorToast !== ''}
        message={showErrorToast}
        autoHideDuration={5000}
        onClose={() => setShowErrorToast('')}
      />
    </form>
  )
}

export default CategoryForm
