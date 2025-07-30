import { Button, Snackbar, Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'
import { default as styled } from 'styled-components'

import NoteContainer from './NoteContainer'

const FormContainer = styled.form`
  width: 100%;
`

interface Props {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  submitText: string
  isValid?: boolean
  errorMessage?: string
}

const FormWrapper: FC<Props> = (props) => {
  const { children, onSubmit, submitText, isValid = true, errorMessage } = props
  const [showErrorToast, setShowErrorToast] = useState(errorMessage || '')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isValid) {
      return
    }

    onSubmit(e)
  }

  return (
    <FormContainer noValidate onSubmit={handleSubmit}>
      <NoteContainer title="Form">
        <Stack spacing="1rem">{children}</Stack>
      </NoteContainer>

      <Button fullWidth variant="contained" type="submit" style={{ marginTop: '1rem' }}>
        {submitText}
      </Button>

      <Snackbar
        open={showErrorToast !== ''}
        message={showErrorToast}
        autoHideDuration={5000}
        onClose={() => setShowErrorToast('')}
      />
    </FormContainer>
  )
}

export default FormWrapper
