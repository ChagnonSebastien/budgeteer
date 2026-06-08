import { Snackbar, Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'
import { default as styled } from 'styled-components'

import Layout from './Layout'
import { SecureButton } from './SecureButton'

const Form = styled.form`
  max-width: 50rem;
`

interface Props {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>
  submitText: string
  isValid?: boolean
  errorMessage?: string
}

const FormWrapper: FC<Props> = (props) => {
  const { children, onSubmit, submitText, isValid = true, errorMessage } = props
  const [showErrorToast, setShowErrorToast] = useState(errorMessage || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isValid || submitting) {
      return
    }

    try {
      setSubmitting(true)
      await onSubmit(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form noValidate onSubmit={handleSubmit}>
      <Layout title="Form">
        <Stack spacing="1rem">{children}</Stack>
      </Layout>

      <SecureButton
        fullWidth
        variant="contained"
        type="submit"
        style={{ marginTop: '1rem' }}
        loading={submitting}
        disabled={!isValid}
      >
        {submitText}
      </SecureButton>

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
