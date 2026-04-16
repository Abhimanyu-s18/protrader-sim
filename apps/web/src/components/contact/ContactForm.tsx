'use client'

import { useState } from 'react'

interface FormFields {
  fullName: string
  email: string
  accountType: string
  subject: string
  message: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INITIAL_FIELDS: FormFields = {
  fullName: '',
  email: '',
  accountType: '',
  subject: '',
  message: '',
}

const ORDERED_FIELDS = ['fullName', 'email', 'subject', 'message'] as const

interface FieldErrors {
  fullName?: string
  email?: string
  subject?: string
  message?: string
}

function IconCheck() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="mx-auto mb-4 text-success"
    >
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" />
      <polyline
        points="15,24 21,30 33,17"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Contact form with client-side validation and a success state.
 * Simulates submission — no API call is made.
 */
export function ContactForm() {
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Basic client-side validation.
   * Note: This is intentionally permissive for UX. Stricter validation must be performed on the server/API.
   */
  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    if (!fields.fullName.trim()) errs.fullName = 'Full name is required.'
    if (!fields.email.trim()) {
      errs.email = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(fields.email)) {
      errs.email = 'Please enter a valid email address.'
    }
    if (!fields.subject.trim()) errs.subject = 'Subject is required.'
    if (!fields.message.trim()) errs.message = 'Message is required.'
    return errs
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      const firstInvalid = ORDERED_FIELDS.find((name) => name in errs)
      if (firstInvalid) {
        const field = document.querySelector(`[name="${firstInvalid}"]`) as HTMLInputElement
        field?.focus()
      }
      return
    }
    try {
      setIsSubmitting(true)
      // Simulate async submission delay
      // NOTE: This is placeholder — real API submission will replace the Promise and may throw/reject,
      // triggering the catch block to set submitError for future network/validation errors.
      await new Promise((resolve) => setTimeout(resolve, 800))
      setSubmitted(true)
    } catch {
      // Error handling retained for future real API submission (network failures, validation errors, etc.)
      setSubmitError('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setFields(INITIAL_FIELDS)
    setErrors({})
    setSubmitError(null)
    setSubmitted(false)
  }

  const inputBase =
    'block w-full rounded-lg border px-4 py-2.5 text-sm text-dark-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors duration-150'
  const inputDefault = 'border-surface-border bg-white'
  const inputError = 'border-danger bg-red-50'

  if (submitted) {
    return (
      <div className="py-10 text-center" aria-live="polite" role="status">
        <IconCheck />
        <h3 className="mb-2 text-xl font-semibold text-dark-700">Message Sent!</h3>
        <p className="mb-8 text-sm text-gray-500">
          Thank you for reaching out. We'll respond within 4 hours during business hours.
        </p>
        <button
          onClick={handleReset}
          className="inline-flex items-center justify-center rounded-lg border border-surface-border px-6 py-2.5 text-sm font-medium text-dark-700 transition-colors duration-150 hover:bg-surface-alt"
        >
          Send Another Message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
      <div className="space-y-5">
        {submitError && (
          <div className="rounded-lg border border-danger bg-red-50 p-4" role="alert">
            <p className="text-sm font-medium text-danger">{submitError}</p>
          </div>
        )}
        {/* Full Name */}
        <div>
          <label
            htmlFor="contact-fullName"
            className="mb-1.5 block text-sm font-medium text-dark-700"
          >
            Full Name{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="contact-fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            value={fields.fullName}
            onChange={handleChange}
            placeholder="John Smith"
            className={`${inputBase} ${errors.fullName ? inputError : inputDefault}`}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p id="fullName-error" className="mt-1.5 text-xs text-danger" role="alert">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-dark-700">
            Email Address{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            placeholder="john@example.com"
            className={`${inputBase} ${errors.email ? inputError : inputDefault}`}
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-xs text-danger" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label
            htmlFor="contact-accountType"
            className="mb-1.5 block text-sm font-medium text-dark-700"
          >
            Account Type
          </label>
          <select
            id="contact-accountType"
            name="accountType"
            value={fields.accountType}
            onChange={handleChange}
            className={`${inputBase} ${inputDefault}`}
          >
            <option value="">Select account type (optional)</option>
            <option value="none">No account yet</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* Subject */}
        <div>
          <label
            htmlFor="contact-subject"
            className="mb-1.5 block text-sm font-medium text-dark-700"
          >
            Subject{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            value={fields.subject}
            onChange={handleChange}
            placeholder="How can we help you?"
            className={`${inputBase} ${errors.subject ? inputError : inputDefault}`}
            aria-describedby={errors.subject ? 'subject-error' : undefined}
            aria-invalid={!!errors.subject}
          />
          {errors.subject && (
            <p id="subject-error" className="mt-1.5 text-xs text-danger" role="alert">
              {errors.subject}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="contact-message"
            className="mb-1.5 block text-sm font-medium text-dark-700"
          >
            Message{' '}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            value={fields.message}
            onChange={handleChange}
            placeholder="Please describe your question or issue in detail..."
            className={`${inputBase} resize-y ${errors.message ? inputError : inputDefault}`}
            aria-describedby={errors.message ? 'message-error' : undefined}
            aria-invalid={!!errors.message}
          />
          {errors.message && (
            <p id="message-error" className="mt-1.5 text-xs text-danger" role="alert">
              {errors.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </button>
      </div>
    </form>
  )
}
