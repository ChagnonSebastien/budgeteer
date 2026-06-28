import { Stack } from '@mui/material'
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
}

const FormWrapper: FC<Props> = (props) => {
  const { children, onSubmit, submitText } = props
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Always delegate to the form's onSubmit, even when the form is incomplete:
    // each form reveals its own validation errors on an invalid submit attempt.
    if (submitting) {
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
      >
        {submitText}
      </SecureButton>
    </Form>
  )
}

export default FormWrapper
