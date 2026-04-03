---
name: kyc-compliance-flow
description: 'Use when: implementing KYC document upload flows, building admin review workflows, managing PII (personally identifiable information), storing files securely, or implementing identity verification compliance. Ensures proper file validation, secure storage, and regulatory compliance for FSC Mauritius / FSA Seychelles. Primary agents: Security, Coding, Architecture.'
---

# KYC Compliance Flow — ProTraderSim

Complete **Know-Your-Customer (KYC) identity verification** workflow with secure file storage, admin review, and regulatory compliance for FSC Mauritius and FSA Seychelles.

---

## 📋 KYC Document Types

### Required Documents

```typescript
enum KycDocumentType {
  PASSPORT = 'PASSPORT', // ID verification
  DRIVER_LICENSE = 'DRIVER_LICENSE', // Alternative ID
  NATIONAL_ID = 'NATIONAL_ID', // Some countries
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS', // Utility bill, lease, etc.
}

enum KycStatus {
  PENDING = 'PENDING', // Not started
  SUBMITTED = 'SUBMITTED', // Awaiting admin review
  UNDER_REVIEW = 'UNDER_REVIEW', // Admin actively reviewing
  APPROVED = 'APPROVED', // Can trade
  REJECTED = 'REJECTED', // Must resubmit
  EXPIRED = 'EXPIRED', // Needs renewal
}

// Trader must submit:
// 1. Passport or National ID (to verify identity)
// 2. Proof of Address (utility bill, lease signed within 3 months)
```

---

## 📤 Trader: Upload Document

### Frontend Upload

```typescript
// platform/src/app/kyc/page.tsx
import { useState } from 'react'
import { useApiClient } from '@/lib/api'

export default function KycPage() {
  const [files, setFiles] = useState<Record<string, File>>({})
  const api = useApiClient()

  const handleUpload = async (docType: string, file: File) => {
    // Validate on frontend
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      alert('Only JPEG, PNG, PDF allowed')
      return
    }

    if (file.size > 10 * 1024 * 1024) {  // 10 MB
      alert('File too large (max 10 MB)')
      return
    }

    // Upload with progress
    const formData = new FormData()
    formData.append('document_type', docType)
    formData.append('file', file)

    try {
      const response = await api.post('/kyc/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          )
          console.log(`Upload progress: ${percent}%`)
        }
      })

      alert('Document uploaded successfully')
      setFiles(prev => ({ ...prev, [docType]: file }))
    } catch (err) {
      alert('Upload failed: ' + err.message)
    }
  }

  return (
    <div>
      <h1>KYC Verification</h1>

      <div>
        <label>Passport or National ID</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => {
            if (e.target.files) {
              handleUpload('PASSPORT', e.target.files[0])
            }
          }}
        />
      </div>

      <div>
        <label>Proof of Address (Utility Bill, Lease)</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => {
            if (e.target.files) {
              handleUpload('PROOF_OF_ADDRESS', e.target.files[0])
            }
          }}
        />
      </div>
    </div>
  )
}
```

### Backend: Save to Cloudflare R2

```typescript
// POST /api/kyc/documents

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const r2 = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
  },
  endpoint: CLOUDFLARE_R2_ENDPOINT, // https://xxx.r2.cloudflarestorage.com
})

export async function uploadKycDocument(
  userId: string,
  docType: string,
  file: Express.Multer.File,
) {
  // Validate file
  const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedMimes.includes(file.mimetype)) {
    throw new ApiError('INVALID_FILE_TYPE', 400)
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError('FILE_TOO_LARGE', 400)
  }

  // Generate secure filename
  const timestamp = Date.now()
  const randomHex = crypto.randomBytes(4).toString('hex')
  const ext = file.originalname.split('.').pop()
  const filename = `kyc/${userId}/${docType}_${timestamp}_${randomHex}.${ext}`

  // Upload to R2
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          'user-id': userId,
          'doc-type': docType,
          'uploaded-by': userId,
          'upload-timestamp': new Date().toISOString(),
        },
      }),
    )
  } catch (err) {
    throw new ApiError('UPLOAD_FAILED', 500, 'Could not upload file')
  }

  // Create DB record
  const kycDocument = await db.kycDocument.create({
    data: {
      user_id: userId,
      document_type: docType,
      file_key: filename,
      file_size_bytes: file.size,
      mime_type: file.mimetype,
      status: 'SUBMITTED',
      uploaded_at: new Date(),
      created_at: new Date(),
    },
  })

  // Notify admins
  io.to('admin:panel').emit('kyc:submitted', {
    user_id: userId,
    document_type: docType,
    id: kycDocument.id,
  })

  return {
    data: {
      document_id: kycDocument.id,
      status: 'SUBMITTED',
    },
  }
}
```

---

## 👨‍💼 Admin: Review Documents

### Admin Dashboard

```typescript
// admin/src/app/kyc/page.tsx
import { useEffect, useState } from 'react'

export default function AdminKycPage() {
  const [pendingUsers, setPendingUsers] = useState([])

  useEffect(() => {
    // Fetch pending KYC submissions
    fetch('/api/admin/kyc/pending')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => setPendingUsers(data.data))
      .catch(err => {
        console.error('Failed to load pending KYC submissions:', err)
        alert('Error loading submissions: ' + err.message)
      })
  }, [])

  return (
    <div>
      <h1>KYC Review Queue</h1>

      {pendingUsers.map(user => (
        <KycReviewCard key={user.id} user={user} />
      ))}
    </div>
  )
}

function KycReviewCard({ user }) {
  const [reviewing, setReviewing] = useState(false)

  const handleApprove = async () => {
    setReviewing(true)
    try {
      await fetch(`/api/admin/kyc/${user.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Documents verified'
        })
      })
      alert('User approved')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setReviewing(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Reason for rejection:')
    if (!reason) return

    setReviewing(true)
    try {
      await fetch(`/api/admin/kyc/${user.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: reason
        })
      })
      alert('User rejected')
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', margin: '1rem 0' }}>
      <h3>{user.email}</h3>

      {user.kyc_documents.map(doc => (
        <div key={doc.id}>
          <strong>{doc.document_type}</strong>
          <a href={`/api/kyc/documents/${doc.file_key}`} target="_blank">
            View Document
          </a>
        </div>
      ))}

      <button onClick={handleApprove} disabled={reviewing}>
        ✓ Approve
      </button>
      <button onClick={handleReject} disabled={reviewing}>
        ✗ Reject
      </button>
    </div>
  )
}
```

### Backend: Admin Approval

```typescript
// POST /api/admin/kyc/:user_id/approve

export async function adminApproveKyc(
  userId: string,
  adminId: string,
  data: { notes?: string }
) {
  // Verify admin
  const admin = await db.staff.findUnique({
    where: { id: adminId },
    select: { role: true }
  })

  if (!['ADMIN', 'SUPER_ADMIN'].includes(admin?.role)) {
    throw new ApiError('FORBIDDEN', 403)
  }

  // Check all required documents submitted
  const documents = await db.kycDocument.findMany({
    where: {
      user_id: userId,
      status: 'SUBMITTED'
    }
  })

  const hasId = documents.some(d =>
    ['PASSPORT', 'DRIVER_LICENSE', 'NATIONAL_ID'].includes(d.document_type)
  )
  const hasProof = documents.some(d => d.document_type === 'PROOF_OF_ADDRESS')

  if (!hasId || !hasProof) {
    throw new ApiError('INCOMPLETE_KYC', 400, 'Missing required documents')
  }

  // Mark all as approved
  await db.kycDocument.updateMany({
    where: {
      user_id: userId,
      status: 'SUBMITTED'
    },
    data: {
      status: 'APPROVED',
      reviewed_by_id: adminId,
      reviewed_at: new Date(),
      admin_notes: data.notes
    }
  })

  // Fetch user before making any updates (critical: fail fast if user not found)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Update user KYC status
  await db.user.update({
    where: { id: userId },
    data: {
      kyc_status: 'APPROVED',
      kyc_approved_at: new Date()
    }
  })

  await resend.emails.send({
    from: 'noreply@protrader.com',
    to: user.email,
    subject: 'KYC Verification Approved',
    react: <KycApprovedEmail />
  })

  // Emit real-time update
  emitToUser(userId, 'kyc:approved', {
    status: 'APPROVED'
  })

  return {
    data: { status: 'APPROVED' }
  }
}
```

### Backend: Admin Rejection

```typescript
// POST /api/admin/kyc/:user_id/reject

export async function adminRejectKyc(
  userId: string,
  adminId: string,
  data: { rejection_reason: string }
) {
  // Verify admin
  const admin = await db.staff.findUnique({
    where: { id: adminId },
    select: { role: true }
  })

  if (!['ADMIN', 'SUPER_ADMIN'].includes(admin?.role)) {
    throw new ApiError('FORBIDDEN', 403)
  }

  // Fetch user before making any updates (critical: fail fast if user not found)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Mark documents as rejected
  const documents = await db.kycDocument.updateMany({
    where: { user_id: userId, status: 'SUBMITTED' },
    data: {
      status: 'REJECTED',
      reviewed_by_id: adminId,
      reviewed_at: new Date(),
      admin_notes: data.rejection_reason
    }
  })

  // Reset user KYC
  await db.user.update({
    where: { id: userId },
    data: { kyc_status: 'REJECTED' }
  })

  await resend.emails.send({
    from: 'noreply@protrader.com',
    to: user.email,
    subject: 'KYC Verification Rejected',
    react: <KycRejectedEmail reason={data.rejection_reason} />
  })

  // Notify user
  emitToUser(userId, 'kyc:rejected', {
    reason: data.rejection_reason,
    can_resubmit: true
  })

  return { success: true }
}
```

---

## 🔐 Security & Compliance

### PII Protection

```typescript
// Never log PII (passport numbers, addresses, etc.)
export function sanitizeKyc(doc: KycDocument) {
  return {
    id: doc.id,
    document_type: doc.document_type,
    status: doc.status,
    uploaded_at: doc.uploaded_at,
    // DO NOT include: user email, personal details
  }
}

// Encrypt sensitive fields at rest (if extra paranoid)
// In production: Use Supabase encrypted columns or AWS KMS
```

### File Validation

```typescript
// Validate MIME type at upload
const ALLOWED_MIMES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
}

// Scan for malware (optional, can integrate VirusTotal API)
async function scanForMalware(buffer: Buffer) {
  // POST to VirusTotal or ClamAV
  // Return isSafe boolean
}
```

### Access Control

```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// Only admins can view documents
app.get('/kyc/documents/:file_key', async (req, res) => {
  // Verify authentication
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }

  // Verify admin role
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN'

  // Fetch the document to check access rights
  const doc = await db.kycDocument.findUnique({
    where: { file_key: req.params.file_key },
  })

  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' })
  }

  // Allow access if owner or admin
  if (req.user.id !== doc.user_id && !isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  // Stream from R2
  try {
    const file = await r2.send(
      new GetObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET,
        Key: req.params.file_key,
      }),
    )

    res.setHeader('Content-Type', file.ContentType || 'application/octet-stream')
    file.Body.pipe(res)
  } catch (err) {
    console.error('R2 download error:', err)
    res.status(500).json({ error: 'DOWNLOAD_FAILED' })
  }
})
```

---

## 📊 KYC State Machine

```
PENDING
  ↓ (user submits documents)
SUBMITTED → UNDER_REVIEW
  ↓
APPROVED (can now trade)
  ↓
EXPIRED (after 5 years, must resubmit)

OR

SUBMITTED → REJECTED (admin rejects)
  ↓ (user resubmits)
SUBMITTED → APPROVED
```

---

## ✅ KYC Compliance Checklist

- [ ] **File Type Validation**: Only JPEG, PNG, PDF
- [ ] **File Size Limit**: Max 10 MB per document
- [ ] **R2 Secure Storage**: Files encrypted at rest, access logs enabled
- [ ] **Metadata Logged**: User, upload time, document type in R2 metadata
- [ ] **PII Not Logged**: Never log passport numbers or addresses to stdout
- [ ] **Admin Access Only**: Non-admins cannot view documents
- [ ] **Audit Trail**: All admin actions (approve/reject) recorded with timestamp + notes
- [ ] **Email Notifications**: On submit, approve, reject
- [ ] **Real-time Alerts**: Admins notified of new KYC submissions
- [ ] **Expiry Handling**: Documents auto-expire after 5 years

---

## 🚨 Common Mistakes

| ❌ Wrong                          | ✅ Correct                         |
| --------------------------------- | ---------------------------------- |
| Store files on disk / local       | Use Cloudflare R2 (S3-compatible)  |
| Log passport numbers              | Only log file key + status         |
| No file type validation           | Validate MIME + file extension     |
| Auto-approve KYC                  | Require manual admin approval      |
| Allow traders to view others' KYC | Enforce strict access control      |
| No audit trail                    | Log who approved, when, with notes |
| Cache PII in memory               | Never cache sensitive documents    |

---

## 📚 Related Skills

- `api-route-creation` — Upload endpoint validation
- `rbac-implementation` — Admin-only approval endpoints
- `security-best-practices` — PII handling and encryption
- `payment-integration` — Gate trading until KYC approved
