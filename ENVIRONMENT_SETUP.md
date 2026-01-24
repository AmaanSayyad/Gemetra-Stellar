# 🔧 Environment Setup Guide

## 📋 Overview

This document explains the environment variables needed and contract deployment requirements for Gemetra-MNEE.

---

## 📝 Environment Variables

### Required Variables

#### 1. **Supabase** (Required for data persistence)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**How to get:**
1. Go to https://app.supabase.com
2. Create a new project or select existing one
3. Go to Settings → API
4. Copy the "Project URL" and "anon public" key

**What it's used for:**
- Storing employee data
- Payment history
- Chat sessions
- User authentication
- Audit logs

---

#### 2. **WalletConnect** (Required for wallet connections)
```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

**How to get:**
1. Go to https://cloud.reown.com/
2. Sign up / Log in
3. Create a new project
4. Copy the Project ID

**Default:** A default project ID is provided, but you should use your own for production.

**What it's used for:**
- Connecting mobile wallets via WalletConnect
- QR code wallet connections

---

### Optional Variables

#### 3. **Gemini AI** (Optional - for AI features)
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**How to get:**
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key

**What it's used for:**
- AI-powered salary parsing
- VAT refund validation
- Chat assistant features

**Note:** The app will work without this, but AI features will be limited.

---

#### 4. **EmailJS** (Optional - for email notifications)
```env
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

**How to get:**
1. Go to https://www.emailjs.com/
2. Sign up and create a service
3. Get your Public Key, Service ID, and Template ID

**What it's used for:**
- Sending email notifications
- Payment confirmations
- Transaction receipts

**Note:** The app will work without this, but email features will be disabled.

---

## 🚀 Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your values:**
   - Open `.env` in your editor
   - Add your Supabase credentials (required)
   - Add your WalletConnect Project ID (required)
   - Add optional API keys if you want those features

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

---

## 📦 Contract Deployment

### ✅ No Custom Contracts Needed!

**Good news:** You don't need to deploy any custom smart contracts for this application.

### Existing Contracts Used

#### 1. **MNEE Stablecoin Contract** (Already Deployed)
- **Address:** `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`
- **Network:** Ethereum Mainnet (Chain ID: 1)
- **Standard:** ERC20
- **Status:** ✅ Already deployed and live

**What it does:**
- This is the MNEE stablecoin contract that the app uses for all payments
- It's already deployed on Ethereum mainnet
- The app just interacts with it (no deployment needed)

---

### Optional: Mock Token for Testing (Sepolia)

If you want to test on Sepolia testnet, you can deploy a mock ERC20 token:

#### Option 1: Use Remix (Easiest)

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

3. Compile (Solidity 0.8.x)
4. Deploy to Sepolia via MetaMask
5. Copy the deployed address
6. Update `src/utils/ethereum.ts`:
   ```typescript
   export const MOCK_MNEE_CONTRACT_ADDRESS_SEPOLIA = 'YOUR_DEPLOYED_ADDRESS' as Address;
   ```

#### Option 2: Use Hardhat/Foundry

If you prefer using a local development environment, you can deploy using Hardhat or Foundry.

---

## 🎯 For Hackathon Demo

### Minimum Setup (Quick Start)

1. **Get Supabase credentials** (5 minutes)
   - Create free Supabase account
   - Create a project
   - Copy URL and anon key

2. **Get WalletConnect Project ID** (2 minutes)
   - Sign up at cloud.reown.com
   - Create project
   - Copy Project ID

3. **Connect to Ethereum Mainnet**
   - Use MetaMask or any Ethereum wallet
   - Switch to Ethereum Mainnet
   - Get some MNEE tokens (see `MNEE_SETUP.md`)

4. **That's it!** No contract deployment needed.

---

## ⚠️ Important Notes

1. **MNEE is Mainnet Only**: The real MNEE contract only exists on Ethereum Mainnet. There's no testnet version.

2. **For Testing**: 
   - Use real MNEE tokens on mainnet (small amounts)
   - OR deploy a mock token on Sepolia for development

3. **Gas Fees**: 
   - Mainnet transactions cost real ETH
   - Sepolia testnet is free (get ETH from faucets)

4. **Environment Variables**:
   - Variables starting with `VITE_` are exposed to the browser
   - Never commit `.env` file to git (it's in `.gitignore`)
   - Always use `.env.example` as a template

---

## 📚 Additional Resources

- **MNEE Setup**: See `MNEE_SETUP.md` for detailed token setup
- **Supabase Docs**: https://supabase.com/docs
- **WalletConnect Docs**: https://docs.reown.com/
- **Ethereum Mainnet**: https://ethereum.org

---

## ✅ Checklist

- [ ] Created `.env` file from `.env.example`
- [ ] Added `VITE_SUPABASE_URL`
- [ ] Added `VITE_SUPABASE_ANON_KEY`
- [ ] Added `VITE_WALLETCONNECT_PROJECT_ID`
- [ ] (Optional) Added `VITE_GEMINI_API_KEY`
- [ ] (Optional) Added EmailJS credentials
- [ ] Connected wallet to Ethereum Mainnet
- [ ] Got some MNEE tokens for testing
- [ ] Ready to run the app! 🚀
