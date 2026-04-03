export interface JwtPayload {
  user_id: string // BigInt serialized as string
  staff_id?: string // For staff JWT tokens
  email: string
  role: string // StaffRole enum value or 'TRADER'
  kyc_status: string // KycStatus enum value
  iat: number
  exp: number
  jti?: string
}
