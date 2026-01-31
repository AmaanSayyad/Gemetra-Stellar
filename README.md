# 🌍 Gemetra

**Global Remittance Infrastructure for VAT Refunds & Payroll**  
Wallet-native. AI-powered. Borderless. Built on Stellar with XLM.

## 🎥 Demo Video

<p align="center">
  <a href="https://youtu.be/FEmaygRs1gs" target="_blank" rel="noopener noreferrer">
    <img src="public/Landingpage.png" alt="Gemetra Landing Page Demo" width="720"/>
  </a>
</p>

*Click the thumbnail above to watch the demo video on YouTube*


---

## 🚀 Overview

**Gemetra** is an **on-chain VAT Refund & Payroll Payment Infrastructure** built on the **Stellar blockchain**.

Using **XLM** (Stellar Lumens), the native cryptocurrency of the Stellar network, this platform enables:

1. **VAT Refunds** – Tourists submit refund requests → receive instant XLM payments on Stellar.
2. **VAT Admin Panel** – Government VAT employees can view, filter, and export all VAT refund claims with complete details (receipt info, personal info, merchant info, payment details).
3. **Payroll Automation** – Employers upload CSV → AI computes salaries → employees receive XLM payments instantly.
4. **Scheduled Payments** – Automate recurring and one-time payments with calendar view and pre-approval system.
5. **Points & Rewards** – Earn points for transactions and convert to XLM tokens.
6. **AI Assistant** – Get instant answers about payroll, payments, and blockchain technology.

---

## 🛑 Problem

- **Tourist VAT Refunds** are slow, manual, and often unclaimed due to airport delays ($50B+ lost annually).
- **Global Payroll** is plagued by high fees (2-5%), delayed wires (3-5 days), hidden FX costs, and compliance overhead.
- Both processes rely on **centralized, fragmented rails** that fail in a borderless world.

---

## ✅ Solution

**Gemetra** provides a **wallet-native remittance infrastructure** where:
- Tourists **receive VAT refunds** instantly in XLM on Stellar.
- Employers **disburse payroll globally** with a single transaction.
- **Automated scheduled payments** for recurring payroll and one-time future payments.
- **Points system** rewards users for transactions and converts to XLM.
- Stellar blockchain ensures **transparency**, **speed** (3-5 second confirmations), and **low fees** (0.00001 XLM per transaction).

---

## ⚡ System Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        WEB["🌐 Web App<br/>(React + Vite)"]
        MOBILE["📱 Mobile<br/>(Responsive)"]
        WALLET["💼 Wallets<br/>(Freighter/Albedo)"]
    end

    subgraph "Application Layer"
        UI["🎨 UI Components<br/>(Dashboard, Forms, Modals)"]
        HOOKS["🪝 React Hooks<br/>(usePayments, useEmployees, usePoints)"]
        SERVICES["⚙️ Services<br/>(AI, Payment, Price)"]
    end

    subgraph "Backend Services"
        SUPABASE["🗄️ Supabase<br/>(PostgreSQL + Storage)"]
        AI["🤖 AI Service<br/>(Google Gemini)"]
        EMAIL["📧 Email Service<br/>(EmailJS)"]
    end

    subgraph "Blockchain Layer"
        STELLAR["⛓️ Stellar Network<br/>(Mainnet/Testnet)"]
        XLM["💰 XLM<br/>(Native Token)"]
        WALLETKIT["🔌 Stellar Wallets Kit<br/>(Wallet Integration)"]
    end

    subgraph "External Services"
        EXPLORER["🔍 Stellar Expert<br/>(Tx Verification)"]
        PRICE["💵 Price API<br/>(Crypto Prices)"]
    end

    WEB --> UI
    MOBILE --> UI
    UI --> HOOKS
    HOOKS --> SERVICES
    SERVICES --> SUPABASE
    SERVICES --> AI
    SERVICES --> EMAIL
    HOOKS --> WALLETKIT
    WALLETKIT --> WALLET
    WALLET --> STELLAR
    STELLAR --> XLM
    STELLAR --> EXPLORER
    SERVICES --> PRICE
    EXPLORER --> UI
```

---

## 📊 Database Schema

```mermaid
erDiagram
    USERS ||--o{ EMPLOYEES : has
    USERS ||--o{ CHAT_SESSIONS : has
    EMPLOYEES ||--o{ PAYMENTS : receives
    EMPLOYEES ||--o{ SCHEDULED_PAYMENTS : has
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : contains
    USER_POINTS ||--o{ POINT_TRANSACTIONS : tracks
    USER_POINTS ||--o{ POINT_CONVERSIONS : converts

    USERS {
        uuid id PK
        text email UK
        text company_name
        timestamptz created_at
        timestamptz updated_at
    }

    EMPLOYEES {
        uuid id PK
        uuid user_id FK
        text name
        text email
        text designation
        text department
        decimal salary
        text wallet_address
        text legacy_eth_address
        date join_date
        text status
        timestamptz created_at
    }

    PAYMENTS {
        uuid id PK
        text employee_id FK
        text user_id
        decimal amount
        text token
        text transaction_hash
        text status
        timestamptz payment_date
        jsonb vat_refund_details
        text blockchain_type
        text network
        text memo
        integer ledger
        timestamptz created_at
    }

    SCHEDULED_PAYMENTS {
        uuid id PK
        uuid employee_id FK
        decimal amount
        text token
        date scheduled_date
        text frequency
        date end_date
        boolean is_recurring
        text status
        timestamptz created_at
    }

    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        text title
        text last_message_content
        timestamptz last_message_timestamp
        timestamptz created_at
    }

    CHAT_MESSAGES {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        text type
        text content
        timestamptz created_at
    }

    USER_POINTS {
        uuid id PK
        text user_id UK
        integer total_points
        integer lifetime_points
        timestamptz created_at
        timestamptz updated_at
    }

    POINT_TRANSACTIONS {
        uuid id PK
        text user_id
        integer points
        text transaction_type
        text source
        text source_id
        text description
        timestamptz created_at
    }

    POINT_CONVERSIONS {
        uuid id PK
        text user_id
        integer points
        decimal xlm_amount
        decimal conversion_rate
        text transaction_hash
        text status
        timestamptz created_at
        timestamptz completed_at
    }
```

---

## 💸 Payment Flow (Bulk Payroll)

```mermaid
sequenceDiagram
    participant Employer
    participant Dashboard
    participant CSV Parser
    participant AI Service
    participant Preview Modal
    participant Wallet
    participant Stellar
    participant Supabase
    participant Points System

    Employer->>Dashboard: Upload CSV File
    Dashboard->>CSV Parser: Parse CSV Data
    CSV Parser->>CSV Parser: Validate Data
    CSV Parser->>AI Service: Analyze Salaries
    AI Service-->>CSV Parser: Validated Data
    CSV Parser-->>Dashboard: Employee List
    
    Employer->>Dashboard: Select Employees
    Dashboard->>Preview Modal: Show Payment Preview
    Preview Modal->>Preview Modal: Calculate Totals
    
    Employer->>Preview Modal: Approve Payments
    Preview Modal->>Wallet: Request Transaction
    Wallet->>Employer: Show Wallet Popup
    Employer->>Wallet: Confirm Transaction
    Wallet->>Stellar: Send XLM Transfers
    
    loop For Each Employee
        Stellar->>Stellar: Execute Payment Operation
        Stellar-->>Supabase: Store Payment Record
    end
    
    Stellar-->>Preview Modal: Transaction Hashes
    Preview Modal->>Points System: Award Points (5 per employee)
    Points System->>Supabase: Store Point Transaction
    Preview Modal-->>Employer: Payment Success
```

---

## 🧾 VAT Refund Flow

```mermaid
sequenceDiagram
    participant Tourist
    participant VAT Page
    participant Document Processor
    participant Review Step
    participant Wallet
    participant Stellar
    participant Supabase
    participant Points System
    participant QR Code

    Tourist->>VAT Page: Upload Receipt (PDF/JPG/PNG)
    VAT Page->>Document Processor: Process Document
    Document Processor->>Document Processor: Extract VAT Info
    Document Processor-->>VAT Page: Refund Amount
    
    alt Manual Entry
        Tourist->>VAT Page: Enter Details Manually
        VAT Page->>Document Processor: Validate Data
    end
    
    Tourist->>VAT Page: Enter Wallet Address
    VAT Page->>Review Step: Show Review Screen
    Tourist->>Review Step: Approve Refund
    
    Review Step->>Supabase: Create Pending Record<br/>(with VAT details in JSONB)
    Review Step->>QR Code: Generate Payment QR
    Review Step->>Wallet: Request Transaction
    Wallet->>Tourist: Show Wallet Popup
    Tourist->>Wallet: Confirm Transaction
    Wallet->>Stellar: Send XLM Transfer
    
    Stellar->>Stellar: Execute Payment Operation
    Stellar-->>Supabase: Update Record (completed)
    Supabase-->>Review Step: Transaction Hash
    Review Step->>Points System: Award 15 Points
    Points System->>Supabase: Store Point Transaction
    Review Step-->>Tourist: Refund Success + QR Code
    
    Note over Supabase: VAT Admin can view<br/>all refunds with full details
```

---

## 📅 Scheduled Payments Flow

```mermaid
flowchart TD
    START([Employer Schedules Payment])
    SETUP{Payment Type?}
    ONETIME[One-Time Payment]
    RECURRING[Recurring Payment]
    
    ONETIME --> SETDATE[Set Payment Date]
    RECURRING --> SETFREQ[Set Frequency:<br/>Daily/Weekly/Monthly]
    SETFREQ --> SETDATE
    SETDATE --> SETAMOUNT[Set Amount]
    SETAMOUNT --> PREAPPROVE{Set Pre-Approval?}
    
    PREAPPROVE -->|Yes| SETLIMIT[Set Spending Limit]
    PREAPPROVE -->|No| SAVE[Save to Database]
    SETLIMIT --> SAVE
    
    SAVE --> CALENDAR[Display in Calendar]
    CALENDAR --> WAIT[Wait for Scheduled Date]
    
    WAIT --> CHECK[Check Due Payments<br/>Every Minute]
    CHECK --> DUE{Payment Due?}
    DUE -->|No| WAIT
    DUE -->|Yes| CHECKLIMIT{Within<br/>Pre-Approval<br/>Limit?}
    
    CHECKLIMIT -->|Yes| AUTO[Auto-Process Payment]
    CHECKLIMIT -->|No| MANUAL[Require Manual Approval]
    
    AUTO --> WALLET[Send via Wallet]
    MANUAL --> POPUP[Show MetaMask Popup]
    POPUP --> WALLET
    
    WALLET --> ETH[Execute on Stellar]
    ETH --> UPDATE[Update Status]
    UPDATE --> POINTS[Award 3 Points]
    POINTS --> NOTIFY[Notify Employee]
    NOTIFY --> END([Payment Complete])
    
    RECURRING --> CHECKEND{End Date<br/>Reached?}
    CHECKEND -->|No| WAIT
    CHECKEND -->|Yes| END
```

---

## 🎁 Points System Flow

```mermaid
flowchart LR
    subgraph "Earning Points"
        PAYMENT[Single Payment<br/>+10 points]
        BULK[Bulk Payment<br/>+5 per employee]
        SCHEDULED[Scheduled Payment<br/>+3 points]
        VAT[VAT Refund<br/>+15 points]
    end
    
    subgraph "Points Storage"
        LOCAL[localStorage<br/>Fast Access]
        DB[(Supabase<br/>Persistence)]
    end
    
    subgraph "Points Display"
        BADGE[Top Bar Badge<br/>Current Balance]
        HISTORY[History Modal<br/>All Transactions]
    end
    
    subgraph "Conversion"
        CONVERT[Convert to XLM<br/>100 points = 1 XLM]
        MINIMUM{Minimum<br/>100 points?}
        TRANSFER[Send XLM Tokens<br/>to Wallet]
    end
    
    PAYMENT --> LOCAL
    BULK --> LOCAL
    SCHEDULED --> LOCAL
    VAT --> LOCAL
    
    LOCAL --> DB
    DB --> LOCAL
    
    LOCAL --> BADGE
    LOCAL --> HISTORY
    
    BADGE --> CONVERT
    CONVERT --> MINIMUM
    MINIMUM -->|Yes| TRANSFER
    MINIMUM -->|No| ERROR[Error: Minimum 100 points]
    TRANSFER --> UPDATE[Update Balance]
    UPDATE --> DB
```

---

## 🏛️ VAT Admin Panel Flow

```mermaid
flowchart TD
    ADMIN[Government VAT Employee]
    WALLET[Connect Wallet]
    AUTH{Wallet Address<br/>Authorized?}
    PANEL[VAT Admin Panel]
    FILTER[Filter & Search]
    EXPORT[Export CSV]
    DETAILS[View Details Modal]
    
    ADMIN --> WALLET
    WALLET --> AUTH
    AUTH -->|No| DENIED[Access Denied]
    AUTH -->|Yes| PANEL
    
    PANEL --> FETCH[Fetch All VAT Refunds<br/>from Supabase]
    FETCH --> DISPLAY[Display Statistics<br/>Total, Completed, Pending, Failed]
    DISPLAY --> TABLE[Show Refunds Table]
    
    TABLE --> FILTER
    FILTER --> SEARCH[Search by Address/ID/Tx]
    FILTER --> STATUS[Filter by Status]
    FILTER --> DATE[Filter by Date Range]
    
    TABLE --> DETAILS
    DETAILS --> MODAL[Show Complete Details<br/>Receipt Info<br/>Personal Info<br/>Merchant Info<br/>Payment Info]
    
    TABLE --> EXPORT
    EXPORT --> CSV[Download CSV<br/>with All Fields]
    
    PANEL --> AUTO[Auto-Refresh<br/>Every 5 Seconds]
    AUTO --> FETCH
```

---

## 🤖 AI Assistant Flow

```mermaid
flowchart TD
    USER[User Asks Question]
    INPUT[AI Assistant Page]
    
    INPUT --> ANALYZE{Question Type?}
    
    ANALYZE -->|Company/Payroll| COMPANY[Company Context]
    ANALYZE -->|MNEE/Ethereum| CRYPTO[Crypto Context]
    ANALYZE -->|Price Query| PRICE[Price Service]
    ANALYZE -->|General| GENERAL[General AI]
    
    COMPANY --> GEMINI[Google Gemini API]
    CRYPTO --> GEMINI
    PRICE --> PRICEAPI[Fetch Real-Time Price]
    GENERAL --> GEMINI
    
    PRICEAPI --> FORMAT[Format Price Response]
    GEMINI --> PROCESS[Process Response]
    FORMAT --> PROCESS
    
    PROCESS --> MARKDOWN[Format as Markdown]
    MARKDOWN --> RENDER[React Markdown Renderer]
    RENDER --> DISPLAY[Display Response]
    
    DISPLAY --> SUGGEST[Show Suggested Questions]
    SUGGEST --> REPLACE{Question Asked?}
    REPLACE -->|Yes| NEWQ[Replace with New Question]
    REPLACE -->|No| KEEP[Keep Current Questions]
    
    NEWQ --> POOL[Question Pool<br/>65+ Questions]
    POOL --> BALANCE{70% Company<br/>Questions?}
    BALANCE -->|Yes| SUGGEST
    BALANCE -->|No| PRIORITIZE[Prioritize Company Questions]
    PRIORITIZE --> SUGGEST
    
    DISPLAY --> SAVE[Save to Chat History]
    SAVE --> SUPABASE[(Supabase)]
```

---

## 🏗️ Component Architecture

```mermaid
graph TB
    subgraph "App Layer"
        APP[App.tsx]
        ROUTER[Router]
    end
    
    subgraph "Layout Components"
        LAYOUT[DashboardLayout]
        SIDEBAR[Sidebar]
        TOPBAR[TopBar]
        HEADER[Header]
    end
    
    subgraph "Feature Pages"
        DASHBOARD[Dashboard]
        EMPLOYEES[Employees]
        PAYMENTS[BulkTransfer]
        SCHEDULED[ScheduledPayments]
        VAT[VATRefundPage]
        VATADMIN[VATAdminPage]
        AI[AIAssistantPage]
        SETTINGS[SettingsPage]
    end
    
    subgraph "Shared Components"
        MODALS[PaymentPreviewModal<br/>AddEmployeeModal<br/>EditEmployeeModal]
        CHARTS[Charts]
        STATS[StatsOverview]
        ACTIVITY[RecentActivity]
        POINTS[PointsDisplay]
    end
    
    subgraph "Hooks"
        HOOKS[usePayments<br/>useEmployees<br/>usePoints<br/>useScheduledPayments<br/>useChat<br/>useNotifications]
    end
    
    subgraph "Services"
        SERVICES[aiService<br/>paymentScheduler<br/>priceService<br/>textProcessingService]
    end
    
    subgraph "Utils"
        STELLAR[stellar.ts<br/>Wallet & Transaction Utils]
        EMAIL[emailService.ts]
    end
    
    APP --> ROUTER
    ROUTER --> LAYOUT
    LAYOUT --> SIDEBAR
    LAYOUT --> TOPBAR
    LAYOUT --> HEADER
    LAYOUT --> DASHBOARD
    LAYOUT --> EMPLOYEES
    LAYOUT --> PAYMENTS
    LAYOUT --> SCHEDULED
    LAYOUT --> VAT
    LAYOUT --> VATADMIN
    LAYOUT --> AI
    LAYOUT --> SETTINGS
    
    DASHBOARD --> STATS
    DASHBOARD --> CHARTS
    DASHBOARD --> ACTIVITY
    TOPBAR --> POINTS
    
    EMPLOYEES --> MODALS
    PAYMENTS --> MODALS
    SCHEDULED --> MODALS
    
    DASHBOARD --> HOOKS
    EMPLOYEES --> HOOKS
    PAYMENTS --> HOOKS
    SCHEDULED --> HOOKS
    VAT --> HOOKS
    AI --> HOOKS
    
    HOOKS --> SERVICES
    HOOKS --> STELLAR
    SERVICES --> STELLAR
    MODALS --> STELLAR
```

---

## 🔮 Features

- **Wallet-Native UX**: Connect any Stellar wallet → confirm → receive XLM.
- **Tourism-Grade Simplicity**: Refunds in 3 steps → Upload → Review → Confirm.
- **VAT Admin Dashboard**: 
  - Wallet-based access control for authorized government employees
  - View all VAT refunds with complete details (receipt, personal, merchant, payment info)
  - Filter by status, date, and search by address/ID/transaction
  - Export all data to CSV for compliance and reporting
  - Real-time updates with auto-refresh every 5 seconds
- **Enterprise Payroll**: AI-driven salary parsing and bulk XLM payouts.
- **Scheduled & Recurring Payments**: 
  - Schedule one-time or recurring payments (daily, weekly, bi-weekly, monthly)
  - Calendar view to visualize all scheduled payments
  - Pre-approval system for automatic processing without wallet popups
  - Auto-process payments within pre-approved spending limits
- **Points & Rewards System**:
  - Earn points for every transaction (10 points per payment, 15 for VAT refunds)
  - Convert 100 points = 1 XLM token
  - Complete transaction history
- **AI Assistant**:
  - 65+ pre-loaded questions
  - Real-time crypto price information
  - Company and payroll insights
  - Chat history persistence
- **Transparency**: All transactions on Stellar blockchain with public audit trail.
- **Compliance Ready**: Supabase logs + JSON/CSV exports for regulators and finance teams.
- **VAT Refund Details Storage**: All form data (VAT reg number, receipt number, passport, flight, merchant info, etc.) stored in JSONB column for complete audit trail.
- **Stellar Integration**: Built on Stellar for fast (3-5 second) confirmations and low fees (0.00001 XLM per transaction).

---

## 🛠️ Tech Stack

- **Blockchain**: Stellar (Mainnet/Testnet)
  - XLM (Stellar Lumens) - Native cryptocurrency
  - Fast confirmations (3-5 seconds)
  - Low fees (0.00001 XLM per transaction)

- **Wallet Integration**: Stellar Wallets Kit
  - Supports Freighter (browser extension) and Albedo (web-based)
  - Mobile-first signing with QR scan/deep link support
  - Custom wallet selection modal

- **AI Layer**: Google Gemini
  - Natural language processing for payroll insights
  - Real-time crypto price information
  - Company financial analysis

- **Backend**: [Supabase](https://supabase.com/)
  - Postgres DB, object storage, user audit logs, and compliance artifacts
  - Row Level Security (RLS) for data protection

- **Frontend**: React + Vite
  - Modern UI with Tailwind CSS and Framer Motion
  - Responsive design for mobile and desktop

- **Transaction Verification**: Stellar Expert
  - Real-time transaction tracking and verification

---

## 📡 Data Flow

```mermaid
flowchart LR
    INPUT[User Input] --> VALIDATE[Validation]
    VALIDATE --> PROCESS[Processing]
    PROCESS --> STORE[(Supabase)]
    STORE --> BLOCKCHAIN[Stellar]
    BLOCKCHAIN --> VERIFY[Stellar Expert]
    VERIFY --> UPDATE[Update UI]
    UPDATE --> NOTIFY[Notifications]
    NOTIFY --> EXPORT[Export Reports]
```

1. **Input**
   - VAT Refunds: Retailer receipts, passport/KYC snapshots.
   - Payroll: Employer CSV with gross pay data.

2. **Processing**
   - AI parses salaries, deductions, taxes.
   - AI validates VAT eligibility & calculates refunds.

3. **Persistence**
   - Supabase stores invoices, payruns, logs, validation proofs.

4. **Execution**
   - API creates XLM payment transaction → wallet signs & submits to Stellar.
   - Stellar network executes native payment operations.

5. **Finality**
   - Stellar confirms transactions (3-5 seconds).
   - Stellar Expert verifies results.
   - Supabase logs for audit.

6. **Audit**
   - Export JSON/CSV/PDF reports for regulators & enterprise compliance.

---

## 🔐 Security & Compliance

- **Wallet-Based Auth**: No passwords, wallet addresses as user IDs
- **Row Level Security**: Supabase RLS policies ensure data isolation
- **Transaction Verification**: All transactions verified on Stellar Expert
- **Immutable Audit Trail**: Supabase DB + Stellar tx hashes provide verifiable record-keeping
- **Circuit Breakers**: Pre-approval limits prevent unauthorized large payments
- **Data Encryption**: All sensitive data encrypted at rest and in transit

---

## 💰 Business Model

- **Platform Fees**: 0.5% per payout (tourist refund / payroll).
- **Enterprise SaaS**: Subscription-based dashboards & compliance exports for HR/finance teams.
- **Partnership Revenue**: Integration fees with VAT Operators & HR SaaS providers.
- **Future Yield**: Earn yield on idle treasury balances + capture micro-spreads on FX conversions.

---

## 📈 Go-To-Market (GTM)

- **Phase 1 – Tourism**:
  Pilot deployment at major airports with VAT operator integration.

- **Phase 2 – Payroll**:
  Target **DAOs, Web3 startups, and SMEs** with XLM-based payroll rails on Stellar.

- **Phase 3 – Enterprise Expansion**:
  Partner with **multinationals** and expand VAT refunds to EU, UK, Singapore, and Saudi Arabia.

- **Phase 4 – DAO Governance**:
  Transition to community-driven governance of refund % rates, fee splits, and expansion markets.

---

## 🔮 Roadmap

- ✅ **MVP**: Wallet-native VAT refunds + CSV-based payroll automation with XLM.
- ✅ **Scheduled Payments**: Calendar view, recurring payments, and pre-approval system.
- ✅ **Points System**: Earn points for transactions, convert to XLM.
- ✅ **AI Assistant**: Natural language interface for payroll and crypto questions.
- ✅ **VAT Admin Panel**: Government dashboard for viewing, filtering, and exporting all VAT refund claims with complete details.
- ✅ **Stellar Migration**: Migrated from Ethereum/MNEE to Stellar/XLM for faster transactions and lower fees.
- 🔄 **Next**: Multi-country VAT support + AI-driven tax compliance engine.
- 🔄 **Later**: Enterprise integrations, PDF-based compliance exports, multi-signature approvals.
- 🌐 **Future**: Gemetra DAO + full protocol governance.

---

## 🌟 Why Stellar?

Gemetra leverages the unique advantages of the Stellar blockchain:

- **Lightning Fast**: 3-5 second transaction confirmations vs Ethereum's minutes.
- **Ultra-Low Fees**: 0.00001 XLM (less than $0.0001) per transaction vs variable gas fees.
- **Native Payments**: XLM transfers don't require smart contracts, simplifying integration.
- **Built for Payments**: Stellar was designed specifically for cross-border payments and remittances.
- **Global Reach**: Stellar's network effects enable true borderless payments.
- **Developer-Friendly**: Simple APIs and SDKs make integration straightforward.
- **Transparency**: All transactions publicly verifiable on Stellar blockchain.
- **Proven at Scale**: Handles millions of transactions daily with 99.99% uptime.

---

## 🔄 Migration from Ethereum to Stellar

**Gemetra has migrated from Ethereum/MNEE to Stellar/XLM** to provide users with faster transactions and significantly lower fees.

### What Changed?

- **Blockchain**: Ethereum → Stellar
- **Token**: MNEE (ERC-20) → XLM (Native)
- **Wallets**: MetaMask/WalletConnect → Freighter/Albedo
- **Transaction Speed**: Minutes → 3-5 seconds
- **Transaction Fees**: Variable gas fees → 0.00001 XLM fixed
- **Block Explorer**: Etherscan → Stellar Expert

### What Stayed the Same?

- All features remain fully functional
- Your account data and payment history are preserved
- The user interface and experience are largely unchanged
- Points system and rewards continue to work

### Action Required

**Employee Wallet Addresses**: If you have existing employees, you'll need to update their wallet addresses from Ethereum format (0x...) to Stellar format (G...). The old addresses are preserved in a legacy field for reference.

**Getting Started with Stellar**:
1. Install [Freighter wallet](https://www.freighter.app/) (browser extension) or use [Albedo](https://albedo.link/) (web-based)
2. Create or import your Stellar account
3. Get some XLM from an exchange or use the [Stellar testnet](https://laboratory.stellar.org/#account-creator?network=test) for testing
4. Connect your wallet to Gemetra and start making payments

For detailed setup instructions, see our [Stellar Setup Guide](docs/STELLAR_SETUP.md).

---

## 🏆 Original Hackathon Project

This project was originally built for the **MNEE Hackathon: Programmable Money for Agents, Commerce, and Automated Finance** using MNEE stablecoin on Ethereum. It has since been migrated to Stellar for improved performance and lower costs.

**Original Hackathon Alignment**:
✅ **Uses MNEE Stablecoin**: Contract address `0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF`  
✅ **Commerce & Creator Tools Track**: VAT refunds and payroll checkout systems  
✅ **Financial Automation Track**: Programmable invoicing and automated payroll  
✅ **AI & Agent Payments**: AI-powered salary computation and payment automation  

---

## 📦 Installation

```bash
# Install dependencies
npm install
# or
pnpm install

# Set up environment variables
cp .env.example .env
# Add your Supabase credentials and API keys

# Run development server
npm run dev
# or
pnpm dev

# Build for production
npm run build
# or
pnpm build
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

#### Required Variables

```env
# Supabase (Required for data persistence)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stellar Network (Required for blockchain operations)
VITE_STELLAR_NETWORK=testnet  # or 'mainnet' for production
VITE_HORIZON_URL=https://horizon-testnet.stellar.org  # or https://horizon.stellar.org for mainnet
```

#### Optional Variables

```env
# Gemini AI (Optional - for AI assistant features)
VITE_GEMINI_API_KEY=your_gemini_api_key

# EmailJS (Optional - for email notifications)
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

**Quick Setup:**
1. Copy `.env.example` to `.env` (if available)
2. Fill in the required variables (Supabase and Stellar)
3. Add optional variables if you want AI or email features
4. Restart the dev server: `npm run dev`

**See `docs/ENVIRONMENT_SETUP.md` for detailed setup instructions.**

### Stellar Network

The application supports both Stellar Mainnet and Testnet:

- **Mainnet**: Production environment with real XLM
  - Horizon URL: `https://horizon.stellar.org`
  - Network Passphrase: `Public Global Stellar Network ; September 2015`

- **Testnet**: Development environment with free test XLM
  - Horizon URL: `https://horizon-testnet.stellar.org`
  - Network Passphrase: `Test SDF Network ; September 2015`
  - Get free test XLM from [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)

⚠️ **Important**: Always test on Stellar Testnet before using Mainnet with real XLM.

**For Testing:**
- Use Stellar Testnet for development
- Get free test XLM from Friendbot
- Switch to Mainnet only when ready for production

See `docs/STELLAR_SETUP.md` for detailed instructions on setting up Stellar wallets and getting XLM.

---

## 📚 Documentation

- **[Environment Setup](docs/ENVIRONMENT_SETUP.md)** - Complete setup guide
- **[Stellar Setup](docs/STELLAR_SETUP.md)** - Setting up Stellar wallets and getting XLM
- **[Stellar Testnet Guide](docs/STELLAR_TESTNET_GUIDE.md)** - Testing with Stellar testnet
- **[Mainnet Configuration](docs/MAINNET_CONFIGURATION.md)** - Production deployment guide
- **[Points System](docs/POINTS_SYSTEM.md)** - Points and rewards documentation
- **[CSV Format Guide](docs/CSV_FORMAT_GUIDE.md)** - Employee CSV upload format
- **[VAT Refund Sample Data](docs/VAT_REFUND_SAMPLE_DATA.md)** - Sample VAT refund data
- **[VAT Document Format Guide](docs/VAT_REFUND_DOCUMENT_FORMAT_GUIDE.md)** - Document requirements
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🌐 Live Demo
- **Demo Video:** https://youtu.be/FEmaygRs1gs
- **Live Application**: https://gemetra-mnee.vercel.app/  
- **GitHub Repository**: https://github.com/AmaanSayyad/Gemetra-mnee  
- **Documentation**: https://docs.google.com/presentation/d/1CV3kaE1mY7rgmB9bTwZTBLGR6BdLryRtaHD4F3MK4M8/edit?usp=sharing

**Note**: The live demo may still be running on the Ethereum/MNEE version. The Stellar migration is available in the latest code on GitHub.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contact

- **Email**: amaansayyad2001@gmail.com
- **Telegram**: [@amaan029](https://t.me/amaan029)
- **GitHub**: [@AmaanSayyad](https://github.com/AmaanSayyad)