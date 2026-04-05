import { createApiClient } from '@protrader/utils'
import type { KycStatus } from '@protrader/types'
import { createLogger } from './logger'

type ApiError = { message?: string; [key: string]: unknown }

interface User {
  id: string
  email: string
  full_name: string
  kyc_status: KycStatus
  created_at: string
  updated_at: string
}

type AuthResponse = {
  access_token: string
  refresh_token?: string
  user?: User
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
const api = createApiClient(API_BASE_URL)
const authLogger = createLogger('auth')

const getToken = () =>
  typeof window !== 'undefined'
    ? (window.localStorage.getItem('access_token') ?? window.sessionStorage.getItem('access_token'))
    : null

export const login = async (data: {
  email: string
  password: string
  remember_me?: boolean
}): Promise<AuthResponse> => api.post('/v1/auth/login', data)

export const register = async (data: {
  full_name: string
  email: string
  password: string
  country: string
  phone: string
  terms_accepted: boolean
  ref_code?: string
}): Promise<AuthResponse> => api.post('/v1/auth/register', data)

export const forgotPassword = async (
  email: string,
): Promise<{ success: boolean; message?: string }> =>
  api.post('/v1/auth/forgot-password', { email })

export const resetPassword = async (
  token: string,
  password: string,
): Promise<{ success: boolean; message?: string }> =>
  api.post('/v1/auth/reset-password', { token, password })

export const verifyEmail = async (token: string): Promise<{ success: boolean; message?: string }> =>
  api.post('/v1/auth/verify-email', { token })

export const kycStatus = async (): Promise<{ kyc_status: KycStatus; documents: unknown[] }> => {
  return api.get('/v1/kyc/status')
}

export const uploadKycDocument = async (
  file: File,
  category: 'IDENTITY' | 'ADDRESS',
  documentType?: string,
): Promise<unknown> => {
  const token = getToken()
  if (!token) {
    throw new Error('Missing auth token')
  }

  // Validate file
  if (!(file instanceof File)) {
    throw new Error('Invalid file: must be a File object')
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed types: ${allowedMimeTypes.join(', ')}`,
    )
  }

  const maxSizeBytes = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File too large: ${file.size} bytes. Maximum size: ${maxSizeBytes} bytes`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_category', category)
  formData.append(
    'document_type',
    documentType ?? (category === 'IDENTITY' ? 'passport' : 'utility_bill'),
  )

  const res = await fetch(`${API_BASE_URL}/v1/kyc/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err: ApiError = await res.json().catch((parseError) => {
      authLogger.error('Failed to parse KYC document upload error response', {
        status: res.status,
        statusText: res.statusText,
        parseError,
      })
      return { message: res.statusText || `HTTP ${res.status}` }
    })
    throw new Error(err.message || `Upload failed: ${res.status}`)
  }

  return res.json()
}
