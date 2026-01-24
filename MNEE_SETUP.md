# 🪙 MNEE Token Setup Guide

## ⚠️ Important: MNEE Has NO Testnet

**MNEE on Ethereum only exists on Mainnet.** There is no testnet contract available. This means:

- ✅ **Mainnet**: Real MNEE tokens (ERC-20) at `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- ❌ **Sepolia/Goerli**: No MNEE testnet tokens available
- ⚠️ **Testing**: You'll need real tokens or deploy a mock ERC20 token

---

## 🛒 How to Get MNEE Tokens for Testing

Since there's no testnet, you have two options:

### Option 1: Get Real MNEE Tokens (Recommended for Hackathon)

Get a small amount of real MNEE tokens from exchanges:

1. **Uniswap** - https://app.uniswap.org
   - Connect your wallet
   - Swap ETH for MNEE
   - Contract: `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`

2. **Rockwallet** - https://rockwallet.com
   - Buy/sell MNEE directly

3. **Other Exchanges**:
   - Ascendx
   - Lbank
   - Coinstore
   - Or any DEX that supports MNEE

4. **MNEE Swap & Bridge**: https://swap-user.mnee.net

**Cost**: You'll need a small amount (e.g., $10-50 worth) for testing. MNEE is a stablecoin, so it should maintain ~$1 USD value.

---

### Option 2: Deploy Mock ERC20 Token on Sepolia (For Development)

For local development and testing, you can deploy a mock ERC20 token on Sepolia:

#### Step 1: Deploy Mock Token

**Using Remix (Easiest)**:

1. Go to https://remix.ethereum.org
2. Create a new file `MockMNEE.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockMNEE is ERC20 {
    constructor() ERC20("Mock MNEE", "mMNEE") {
        // Mint 1,000,000 tokens to deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    // Function to mint tokens for testing
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

3. Compile the contract (use Solidity 0.8.x)
4. Deploy to Sepolia:
   - Select "Injected Provider" (MetaMask)
   - Switch MetaMask to Sepolia network
   - Deploy the contract
   - Copy the deployed contract address

#### Step 2: Update Code

Update `src/utils/ethereum.ts`:

```typescript
export const MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA = 'YOUR_DEPLOYED_CONTRACT_ADDRESS' as Address;
```

#### Step 3: Get Sepolia ETH

You'll need Sepolia ETH for gas:
- https://sepoliafaucet.com
- https://faucet.quicknode.com/ethereum/sepolia

#### Step 4: Mint Mock Tokens

Call the `mint()` function on your deployed contract to get test tokens.

---

## 🔧 Configuration

### For Mainnet (Production/Hackathon Demo)

1. Connect wallet to **Ethereum Mainnet**
2. Ensure you have:
   - ETH for gas fees
   - MNEE tokens for testing
3. The app will automatically use the mainnet MNEE contract

### For Sepolia (Development)

1. Deploy mock ERC20 token (see Option 2 above)
2. Update `MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA` in `src/utils/ethereum.ts`
3. Connect wallet to **Sepolia Testnet**
4. Mint mock tokens to your wallet

---

## 📝 Network Detection

The app automatically detects which network you're on:

- **Mainnet (Chain ID: 1)**: Uses real MNEE contract
- **Sepolia (Chain ID: 11155111)**: Uses mock token (if configured)

---

## ⚠️ Warnings

1. **Mainnet = Real Money**: Transactions on mainnet use real tokens and cost real ETH for gas
2. **Test Carefully**: Always test with small amounts first
3. **Gas Costs**: Ethereum mainnet gas can be expensive. Consider using Sepolia with mock tokens for development
4. **No Refunds**: Once sent, transactions cannot be reversed

---

## 🚀 Quick Start for Hackathon

1. **Get MNEE Tokens**:
   - Use Uniswap or Rockwallet to swap ETH for MNEE
   - Get ~$20-50 worth for testing

2. **Connect Wallet**:
   - Use MetaMask or any Ethereum wallet
   - Switch to Ethereum Mainnet

3. **Test the App**:
   - Connect wallet in the app
   - Try sending a small MNEE payment
   - Verify on Etherscan

---

## 📚 Resources

- **MNEE Website**: https://mnee.io
- **Etherscan**: https://etherscan.io/token/0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF
- **ERC-20 Standard**: https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
- **wagmi Docs**: https://wagmi.sh
- **OpenZeppelin**: https://docs.openzeppelin.com/contracts

---

## 💡 Tips

- Start with small amounts when testing
- Keep some ETH for gas fees (usually $1-5 is enough for many transactions)
- Use Etherscan to verify transactions
- For hackathon demo, mainnet with real tokens shows the best real-world functionality
