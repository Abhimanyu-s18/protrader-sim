import { createApiClient } from '@protrader/utils'

const BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:4000'

export const api = createApiClient(BASE_URL)
