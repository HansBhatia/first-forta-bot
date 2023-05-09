import {
  Finding,
  FindingSeverity,
  FindingType,
  HandleTransaction,
  TransactionEvent,
  ethers,
} from "forta-agent";
import { MAX_SUPPLY_PEPE } from "./constants";

export const UNI_POOL_SWAP_EVENT =
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)";
export const UNI_PEPE_WETH_POOL_ADDRESS =
  "0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f";
export const WETH_PEPE_DECIMALS = 18;
let findingsCount = 0;

// Test more outflow than inflow

const handleTransaction: HandleTransaction = async (
  txEvent: TransactionEvent
) => {
  const findings: Finding[] = [];

  // limiting this agent to emit only 5 findings so that the alert feed is not spammed
  if (findingsCount >= 5) return findings;

  // filter the transaction logs for Tether transfer events
  const uniPoolTransferEvents = txEvent.filterLog(
    UNI_POOL_SWAP_EVENT,
    UNI_PEPE_WETH_POOL_ADDRESS
  );

  let NET_PEPE = ethers.BigNumber.from(0);

  uniPoolTransferEvents.forEach((transferEvent) => {
    // extract transfer event arguments
    const { amount0In, amount0Out } = transferEvent.args;
    if (amount0In < amount0Out) {
      return;
    }
    // shift decimals of transfer value
    NET_PEPE = NET_PEPE.add(
      ethers.BigNumber.from(amount0In)
        .sub(ethers.BigNumber.from(amount0Out))
        .div(ethers.BigNumber.from(10).mul(WETH_PEPE_DECIMALS))
    );
  });

  // check if its over 0.0000000001 %
  if (NET_PEPE.mul(100000000000).div(MAX_SUPPLY_PEPE).gte(1)) {
    findings.push(
      Finding.fromObject({
        name: "Pepe outflow",
        description: `High amount of PEPE out(more than 0.0000000001% in one txn): ${NET_PEPE}`,
        alertId: "FORTA-1",
        severity: FindingSeverity.Critical,
        type: FindingType.Info,
        metadata: {},
      })
    );
    findingsCount++;
  }
  return findings;
};

// const initialize: Initialize = async () => {
//   // do some initialization on startup e.g. fetch data
// }

// const handleBlock: HandleBlock = async (blockEvent: BlockEvent) => {
//   const findings: Finding[] = [];
//   // detect some block condition
//   return findings;
// }

// const handleAlert: HandleAlert = async (alertEvent: AlertEvent) => {
//   const findings: Finding[] = [];
//   // detect some alert condition
//   return findings;
// }

export default {
  // initialize,
  handleTransaction,
  // handleBlock,
  // handleAlert
};
