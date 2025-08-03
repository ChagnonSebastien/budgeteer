import { Button, Snackbar, Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'
import { default as styled } from 'styled-components'

import Layout from './Layout'

const Form = styled.form`
  max-width: 50rem;
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
    <Form noValidate onSubmit={handleSubmit}>
      <Layout title="Form">
        <Stack spacing="1rem">{children}</Stack>
      </Layout>

      <Button fullWidth variant="contained" type="submit" style={{ marginTop: '1rem' }}>
        {submitText}
      </Button>

      <Snackbar
        open={showErrorToast !== ''}
        message={showErrorToast}
        autoHideDuration={5000}
        onClose={() => setShowErrorToast('')}
      />
    </Form>
  )
}

export default FormWrapper
