'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button, Card, Input } from '@protrader/ui'
import { kycStatus, uploadKycDocument } from '@/lib/api'

const StepLabels = ['Personal Info', 'Identity Document', 'Address Proof', 'Review & Submit']

const PersonalSchema = z.object({
  dob: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(5, 'Address is required'),
  occupation: z.string().min(2, 'Occupation is required'),
})

type PersonalForm = z.infer<typeof PersonalSchema>

const documentInputClass =
  'w-full rounded border border-surface-border px-3 py-2 text-sm focus:border-primary outline-none'

export default function KycPage() {
  const [step, setStep] = useState(1)
  const [personalData, setPersonalData] = useState<PersonalForm | null>(null)
  const [identityFile, setIdentityFile] = useState<File | null>(null)
  const [addressFile, setAddressFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalForm>({ resolver: zodResolver(PersonalSchema) })

  const progressPercent = useMemo(() => (step / StepLabels.length) * 100, [step])

  const proceedPersonal = (data: PersonalForm) => {
    setPersonalData(data)
    setStep(2)
  }

  const uploadDoc = async (file: File | null, category: 'IDENTITY' | 'ADDRESS') => {
    if (!file) {
      setStatusMessage('Please select a file before uploading.')
      return
    }
    setStatusMessage(null)
    setLoading(true)

    try {
      await uploadKycDocument(file, category)
      setStatusMessage(`${category.toLowerCase()} document uploaded successfully.`)
      setStep(category === 'IDENTITY' ? 3 : 4)
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const submitApplication = async () => {
    setStatusMessage(null)
    setLoading(true)

    try {
      await kycStatus(personalData)
      setCompleted(true)
      setStatusMessage('KYC documents submitted. Please wait for approval.')
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to confirm KYC status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl space-y-6">
        <h1 className="text-xl font-semibold">KYC onboarding</h1>

        <div className="space-y-2">
          <div className="bg-surface-border h-2 w-full rounded">
            <div
              className="bg-primary h-2 rounded transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-dark-500 text-sm">
            Step {step} of {StepLabels.length}: {StepLabels[step - 1]}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmit(proceedPersonal)} className="space-y-4">
            <Input
              label="Date of birth"
              type="date"
              {...register('dob')}
              error={errors.dob?.message}
            />
            <Input
              label="Residential address"
              type="text"
              {...register('address')}
              error={errors.address?.message}
            />
            <Input
              label="Occupation"
              type="text"
              {...register('occupation')}
              error={errors.occupation?.message}
            />
            <div className="flex justify-end gap-2">
              <Button type="submit" loading={loading}>
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-dark-500 text-sm">
              Upload a photo of your passport or national ID (JPEG, PNG, PDF).
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className={documentInputClass}
              onChange={(e) => setIdentityFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button loading={loading} onClick={() => uploadDoc(identityFile, 'IDENTITY')}>
                Upload & Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-dark-500 text-sm">
              Upload proof of residence (utility bill, bank statement).
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className={documentInputClass}
              onChange={(e) => setAddressFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button loading={loading} onClick={() => uploadDoc(addressFile, 'ADDRESS')}>
                Upload & Continue
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium">Review your submission</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>DOB</strong>: {personalData?.dob}
              </p>
              <p>
                <strong>Address</strong>: {personalData?.address}
              </p>
              <p>
                <strong>Occupation</strong>: {personalData?.occupation}
              </p>
              <p>
                <strong>ID File</strong>: {identityFile?.name ?? 'Uploaded'}
              </p>
              <p>
                <strong>Address File</strong>: {addressFile?.name ?? 'Uploaded'}
              </p>
            </div>

            {statusMessage && <p className="text-dark-500 text-sm">{statusMessage}</p>}

            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button loading={loading} onClick={submitApplication} disabled={completed}>
                {completed ? 'Submitted' : 'Submit KYC'}
              </Button>
            </div>
          </div>
        )}

        {statusMessage && step !== 4 && <p className="text-dark-500 text-sm">{statusMessage}</p>}
      </Card>
    </div>
  )
}
