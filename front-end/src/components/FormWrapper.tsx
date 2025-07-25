import { Button, Snackbar, Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'
import styled from 'styled-components'

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
        <div style={{ color: '#6b7280', margin: '0 1rem', transform: 'translateY(0.5rem)' }}>Form</div>
        <div style={{ borderBottom: '1px solid #6b7280', flexGrow: 1 }} />
      </div>
      <Stack spacing="1rem" sx={{ padding: '2rem 1rem', border: '1px solid #6b7280', borderTop: 0 }}>
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
