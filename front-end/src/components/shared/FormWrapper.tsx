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
  isValid?: boolean
}

const FormWrapper: FC<Props> = (props) => {
  const { children, onSubmit, submitText, isValid = true } = props
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
    </Form>
  )
}

export default FormWrapper
