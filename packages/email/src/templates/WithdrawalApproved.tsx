import { Hr, Text } from '@react-email/components'
import { Layout, emailStyles } from '../components/Layout'

export interface WithdrawalApprovedEmailProps {
  fullName: string
  amountFormatted: string
  walletAddress: string
  txHash?: string
}

/**
 * Sent when a withdrawal request is approved and the funds have been sent.
 */
export function WithdrawalApprovedEmail({
  fullName,
  amountFormatted,
  walletAddress,
  txHash,
}: WithdrawalApprovedEmailProps) {
  return (
    <Layout preview={`Your withdrawal of ${amountFormatted} has been approved and sent`}>
      <Text style={emailStyles.h1}>Withdrawal approved</Text>
      <Text style={emailStyles.greeting}>Hi {fullName},</Text>
      <Text style={emailStyles.body}>
        Your withdrawal request has been approved and the funds have been sent to your wallet.
      </Text>

      <div style={emailStyles.infoBox}>
        <Text style={{ ...emailStyles.boxText, marginBottom: '6px' }}>
          <strong>Amount:</strong> {amountFormatted}
        </Text>
        <Text style={{ ...emailStyles.boxText, margin: '0' }}>
          <strong>Wallet address:</strong>
        </Text>
        <Text style={emailStyles.tokenBox}>{walletAddress}</Text>
        {txHash && (
          <>
            <Text style={{ ...emailStyles.boxText, margin: '0' }}>
              <strong>Transaction hash:</strong>
            </Text>
            <Text style={emailStyles.tokenBox}>{txHash}</Text>
          </>
        )}
      </div>

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.muted}>
        Depending on network conditions, funds typically arrive within 10–60 minutes. If you do not
        receive your funds within 24 hours, please contact support.
      </Text>
    </Layout>
  )
}

export default function Preview() {
  return (
    <WithdrawalApprovedEmail
      fullName="Jane Doe"
      amountFormatted="$123.45"
      walletAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
      txHash="0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"
    />
  )
}
