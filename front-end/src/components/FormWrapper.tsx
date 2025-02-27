import { Button, Snackbar, Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'
import styled from 'styled-components'

import '../styles/form-components-tailwind.css'

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
      <div style={{ display: 'flex' }}>
        <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>Form</div>
        <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
      </div>
      <Stack spacing="1rem" sx={{ padding: '2rem 1rem', border: '1px grey solid', borderTop: 0 }}>
        {children}
      </Stack>

      <div style={{ height: '1rem' }} />
      <Button fullWidth variant="contained" type="submit">
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
