export const NativeStakingVaultABI = [
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      { "name": "receiver", "type": "address" },
      { "name": "minSharesOut", "type": "uint256" }
    ],
    "outputs": [{ "name": "shares", "type": "uint256" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      { "name": "assets", "type": "uint256" },
      { "name": "receiver", "type": "address" },
      { "name": "owner", "type": "address" },
      { "name": "maxSharesIn", "type": "uint256" }
    ],
    "outputs": [{ "name": "shares", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "convertToShares",
    "inputs": [{ "name": "assets", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "convertToAssets",
    "inputs": [{ "name": "shares", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalAssets",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stM",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  }
] as const;
