# 🗄️ Supabase Setup Guide for Gemetra-MNEE

Complete step-by-step guide to set up a new Supabase project for the Gemetra-MNEE application.

---

## 📋 Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com) if you don't have one)
- Your Gemetra-MNEE project codebase

---

## 🚀 Step 1: Create a New Supabase Project

1. **Go to Supabase Dashboard**
   - Visit [https://app.supabase.com](https://app.supabase.com)
   - Log in with your account

2. **Create New Project**
   - Click **"New Project"** button (top right or in your organization)
   - Fill in the project details:
     - **Organization**: Select your organization (or create one)
     - **Project name**: `Gemetra-Mnee` (or your preferred name)
     - **Database password**: 
       - Click **"Generate a password"** for a strong password
       - **IMPORTANT**: Copy and save this password securely! You'll need it later.
       - The password should be strong (green bar, not yellow)
     - **Region**: Select **"Asia-Pacific"** (or closest to your users)
   
3. **Security Options** (Expand if needed)
   - **What connections do you plan to use?**
     - Select: **"Data API + Connection String"** ✅
   - **Data API configuration:**
     - Select: **"Use public schema for Data API"** ✅ (DEFAULT)

4. **Advanced Configuration** (Optional)
   - **Postgres Type**: **"Postgres"** (DEFAULT) ✅

5. **Click "Create new project"**
   - Wait 2-3 minutes for the project to be provisioned
   - You'll see a loading screen with progress

---

## 🔑 Step 2: Get Your API Keys

Once your project is created:

1. **Go to Project Settings**
   - Click the **⚙️ Settings** icon (gear) in the left sidebar
   - Select **"API"** from the settings menu

2. **Copy Your Credentials**
   You'll need these values:
   
   - **Project URL**: 
     - Found under "Project URL"
     - Example: `https://xxxxxxxxxxxxx.supabase.co`
     - Copy this value
   
   - **anon/public key**:
     - Found under "Project API keys" → "anon" → "public"
     - This is a long string starting with `eyJ...`
     - Click the **👁️** icon to reveal, then copy
   
   - **service_role key** (Optional, for admin operations):
     - Found under "Project API keys" → "service_role" → "secret"
     - **⚠️ WARNING**: Keep this secret! Never expose in client-side code.
     - Only use for server-side operations

3. **Save These Values**
   - Keep them in a secure place (password manager, notes app)
   - You'll need them in Step 4

---

## 🗃️ Step 3: Set Up Database Schema (Run Migrations)

You need to run the database migrations to create all required tables.

### Option A: Using Supabase SQL Editor (Recommended for Beginners)

1. **Open SQL Editor**
   - In the left sidebar, click **"SQL Editor"**
   - Click **"New query"**

2. **Run Migrations in Order**
   
   Run each migration file **one at a time** in this exact order:

   #### Migration 1: Base Tables
   - Open: `supabase/migrations/20250617234140_patient_smoke.sql`
   - Copy **ALL** the SQL content
   - Paste into SQL Editor
   - Click **"Run"** (or press `Cmd+Enter` / `Ctrl+Enter`)
   - Wait for "Success" message ✅

   #### Migration 2: Points System
   - Open: `supabase/migrations/20250612200000_points_system.sql`
   - Copy **ALL** the SQL content
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for "Success" message ✅

   #### Migration 3: Add user_id to payments
   - Open: `supabase/migrations/20250620044226_small_sun.sql`
   - Copy **ALL** the SQL content
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for "Success" message ✅

   #### Migration 4: Chat System
   - Open: `supabase/migrations/20250620015504_navy_block.sql`
   - Copy **ALL** the SQL content
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for "Success" message ✅

   #### Migration 5: VAT Refund Access (IMPORTANT!)
   - Open: `supabase/migrations/20250620060000_vat_refund_access.sql`
   - Copy **ALL** the SQL content
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for "Success" message ✅
   - **This migration is critical for VAT refunds to work!**

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

---

## ✅ Step 4: Verify Database Setup

1. **Check Tables Created**
   - Go to **"Table Editor"** in the left sidebar
   - You should see these tables:
     - ✅ `users`
     - ✅ `employees`
     - ✅ `payments`
     - ✅ `user_points`
     - ✅ `point_transactions`
     - ✅ `point_conversions`
     - ✅ `chat_sessions`
     - ✅ `chat_messages`

2. **Verify RLS Policies**
   - Go to **"Authentication"** → **"Policies"**
   - Or use SQL Editor to check:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'payments';
   ```
   - You should see policies for VAT refunds

---

## 🔧 Step 5: Configure Environment Variables

1. **Create `.env` File**
   - In your project root (`/Users/amaan/Downloads/Github2/Gemetra-Mnee/`)
   - Create a file named `.env` (if it doesn't exist)

2. **Add Your Supabase Credentials**
   
   Open `.env` and add:

   ```env
   # Supabase Configuration (REQUIRED)
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Replace with your actual values:**
   - `VITE_SUPABASE_URL`: Your Project URL from Step 2
   - `VITE_SUPABASE_ANON_KEY`: Your anon/public key from Step 2

3. **Add WalletConnect (REQUIRED)**
   
   ```env
   # WalletConnect (REQUIRED)
   VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
   ```
   
   To get WalletConnect Project ID:
   - Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Sign up/login
   - Create a new project
   - Copy the Project ID

4. **Add Optional Services**
   
   ```env
   # Gemini AI (Optional - for AI assistant)
   VITE_GEMINI_API_KEY=your_gemini_api_key
   
   # EmailJS (Optional - for email notifications)
   VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
   VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
   ```

5. **Save the File**
   - Make sure `.env` is saved
   - **⚠️ IMPORTANT**: Never commit `.env` to Git! It should be in `.gitignore`

---

## 🧪 Step 6: Test Your Setup

1. **Start the Development Server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Test Database Connection**
   - Open the app in your browser
   - Connect your wallet
   - Try creating an employee or making a payment
   - Check the browser console for any errors

3. **Test VAT Refund**
   - Go to "VAT Refund" page
   - Submit a test refund
   - Check if it appears in "Refund History"

4. **Test Admin Panel**
   - Connect with the admin wallet: `0xF7249B507F1f89Eaea5d694cEf5cb96F245Bc5b6`
   - Go to "VAT Admin" page
   - You should see all VAT refunds from all users

---

## 🔍 Step 7: Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:**
- Check that `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart the dev server after adding variables

### Issue: "RLS policy violation" or "permission denied"

**Solution:**
- Make sure you ran **all migrations** in order
- Especially check Migration 5 (VAT refund access)
- Verify RLS policies in Supabase dashboard

### Issue: "VAT refunds not appearing in admin panel"

**Solution:**
1. Check browser console for errors
2. Verify Migration 5 was run successfully
3. Check that `employee_id` column in `payments` table is `text` type (not `uuid`)
4. Run this SQL to check:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'payments' AND column_name = 'employee_id';
   ```
   Should show: `data_type = 'text'`

### Issue: "Cannot insert payment with employee_id = 'vat-refund'"

**Solution:**
- The `employee_id` column must be `text` type
- Run Migration 5 again if needed
- Check that foreign key constraint was removed

---

## 📊 Step 8: Verify Database Schema

Run this SQL in Supabase SQL Editor to verify everything is set up correctly:

```sql
-- Check payments table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- Check RLS policies for payments
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'payments';

-- Check if VAT refunds can be read
SELECT COUNT(*) as total_vat_refunds
FROM payments 
WHERE employee_id = 'vat-refund';
```

---

## 🎯 Quick Checklist

Before you start using the app, verify:

- [ ] Supabase project created
- [ ] Database password saved securely
- [ ] All 5 migrations run successfully
- [ ] `.env` file created with correct values
- [ ] `VITE_SUPABASE_URL` set correctly
- [ ] `VITE_SUPABASE_ANON_KEY` set correctly
- [ ] `VITE_WALLETCONNECT_PROJECT_ID` set
- [ ] Dev server starts without errors
- [ ] Can connect wallet
- [ ] Can create employees
- [ ] Can make payments
- [ ] VAT refunds work
- [ ] Admin panel shows VAT refunds

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for error messages
   - Check Network tab for failed requests

2. **Check Supabase Logs**
   - Go to Supabase Dashboard
   - Check "Logs" section for database errors

3. **Verify Environment Variables**
   - Make sure `.env` file is in the project root
   - Restart dev server after changes

4. **Re-run Migrations**
   - If something is wrong, you can drop tables and re-run migrations
   - **⚠️ WARNING**: This will delete all data!

---

## 📝 Next Steps

Once setup is complete:

1. **Test All Features**
   - Employee management
   - Payment processing
   - VAT refunds
   - Points system
   - AI assistant
   - Scheduled payments

2. **Set Up Production**
   - Use production Supabase project
   - Update environment variables
   - Deploy to Vercel/Netlify

3. **Monitor Usage**
   - Check Supabase dashboard for usage stats
   - Monitor database size
   - Set up alerts if needed

---

**🎉 Congratulations! Your Supabase setup is complete!**

You can now use all features of Gemetra-MNEE with full database persistence.
