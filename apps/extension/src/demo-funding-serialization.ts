import type { DemoFundingRequestReport, DemoFundingStatusReport, PublicBalancesReport } from '@zk-freighter/core'
import type { ExtensionDemoFundingRequestReport, ExtensionDemoFundingStatusReport, SerializablePublicBalancesReport } from './dappResponses'

export function serializeDemoFundingStatusReport(report: DemoFundingStatusReport): ExtensionDemoFundingStatusReport {
  return {
    status: report.status,
    network: report.network,
    userAddress: report.userAddress,
    blockers: report.blockers,
    hostedFunding: report.hostedFunding,
    ...(report.balances ? { balances: serializePublicBalances(report.balances) } : {}),
  }
}

export function serializeDemoFundingRequestReport(report: DemoFundingRequestReport): ExtensionDemoFundingRequestReport {
  return {
    status: report.status,
    network: report.network,
    userAddress: report.userAddress,
    trustline: report.trustline,
    hostedFunding: report.hostedFunding,
    blockers: report.blockers,
    ...(report.balances ? { balances: serializePublicBalances(report.balances) } : {}),
  }
}

function serializePublicBalances(report: PublicBalancesReport): SerializablePublicBalancesReport {
  return {
    ...report,
    balances: {
      XLM: report.balances.XLM.toString(),
      USDC: report.balances.USDC.toString(),
    },
  }
}
