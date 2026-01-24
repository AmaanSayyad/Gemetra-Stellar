# ⚡ Quick Supabase Setup Reference

## 🎯 Essential Steps (5 minutes)

### 1. Create Supabase Project
- Go to [app.supabase.com](https://app.supabase.com)
- Click **"New Project"**
- Name: `Gemetra-Mnee`
- **Generate password** → **SAVE IT!**
- Region: `Asia-Pacific`
- Click **"Create new project"**

### 2. Get API Keys
- Settings ⚙️ → **API**
- Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- Copy **anon/public key** (long string starting with `eyJ...`)

### 3. Run Migrations
- Go to **SQL Editor** in Supabase
- Run these files **in order**:
  1. `20250617234140_patient_smoke.sql`
  2. `20250612200000_points_system.sql`
  3. `20250620044226_small_sun.sql`
  4. `20250620015504_navy_block.sql`
  5. `20250620060000_vat_refund_access.sql` ⚠️ **CRITICAL!**

### 4. Create `.env` File
Create `.env` in project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
```

### 5. Test
```bash
npm run dev
```

---

## 📋 Migration Files Location

All migration files are in:
```
supabase/migrations/
```

Run them in SQL Editor, one at a time.

---

## ✅ Verification

After setup, verify:
- [ ] Can connect wallet
- [ ] Can create employees
- [ ] VAT refunds work
- [ ] Admin panel shows refunds

---

**📖 Full Guide**: See `SUPABASE_SETUP_GUIDE.md` for detailed instructions.
