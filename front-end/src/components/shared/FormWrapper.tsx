import { Stack } from '@mui/material'
import { FC, FormEvent, ReactNode, useState } from 'react'

import { Section } from './Layout'
import { SecureButton } from './SecureButton'

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
    <Stack
      component="form"
      noValidate
      onSubmit={handleSubmit}
      spacing={2}
      sx={{ mt: 2, maxWidth: (t) => t.contentWidth.default }}
    >
      <Section title="Form">
        <Stack spacing={2}>{children}</Stack>
      </Section>

      <SecureButton fullWidth variant="contained" type="submit" loading={submitting}>
        {submitText}
      </SecureButton>
    </Stack>
  )
}

export default FormWrapper
