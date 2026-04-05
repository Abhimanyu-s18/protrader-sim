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
        <Text style={{ ...emailStyles.infoBoxText, marginBottom: '6px' }}>
          <strong>Amount:</strong> {amountFormatted}
        </Text>
        <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
          <strong>Wallet address:</strong>
        </Text>
        <Text style={emailStyles.tokenBox}>{walletAddress}</Text>
        {txHash && (
          <>
            <Text style={{ ...emailStyles.infoBoxText, margin: '0' }}>
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
