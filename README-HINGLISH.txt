# DealKhoj Admin Panel — Complete Setup Guide (Hinglish)
## Beginner-Friendly Step-by-Step Manual

---

> **Yeh guide Hinglish (Hindi + English mix) mein hai taaki aap easily samajh sakein.**

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Step 1: Supabase Account Banao](#3-step-1-supabase-account-banao)
4. [Step 2: Database Schema Run Karo](#4-step-2-database-schema-run-karo)
5. [Step 3: Pehla Admin User Banao (Secure)](#5-step-3-pehla-admin-user-banao)
6. [Step 4: Config File Update Karo](#6-step-4-config-file-update-karo)
7. [Step 5: GitHub Pages pe Deploy Karo](#7-step-5-github-pages-pe-deploy-karo)
8. [Admin Panel Use Karna](#8-admin-panel-use-karna)
9. [Products Manage Karna](#9-products-manage-karna)
10. [Affiliate Links Setup Karna](#10-affiliate-links-setup-karna)
11. [Security Notes](#11-security-notes)
12. [Troubleshooting](#12-troubleshooting)
13. [Limitations](#13-limitations)

---

## 1. Project Overview

**DealKhoj** ek affiliate shopping website hai jahan:
- **Public website** (`index.html`) — visitors ko deals dikhata hai
- **Admin panel** (`admin.html`) — aap products, categories, stores manage karte ho

**Technology:**
- Frontend: HTML + CSS + JavaScript (static files)
- Database: Supabase (free PostgreSQL cloud)
- Auth: Supabase Auth (email + password)
- Hosting: GitHub Pages (free)

---

## 2. File Structure

```
DealKhoj/
├── index.html              ← Public website
├── style.css               ← Public website styles
├── script.js               ← Public website JS
├── admin.html              ← Admin panel
├── admin.css               ← Admin panel styles
├── admin.js                ← Admin panel JS
├── supabase-config.js      ← ⚠️ YAHAN APNA CONFIG DAALO
├── supabase-schema.sql     ← Database schema (run karo Supabase mein)
└── README-ADMIN-HINGLISH.md ← Yeh file
```

---

## 3. Step 1: Supabase Account Banao

### 3.1 Account Create Karo

1. Browser mein jao: **https://supabase.com**
2. "Start your project" click karo
3. GitHub se sign in karo (recommended) ya email se
4. Free tier select karo

### 3.2 New Project Banao

1. "New Project" click karo
2. Yeh details bharo:
   - **Name:** `dealkhoj` (ya koi bhi naam)
   - **Database Password:** ek strong password likho — **SAVE KAR LO YEH PASSWORD** (secure jagah pe)
   - **Region:** `Southeast Asia (Singapore)` — India ke liye fastest
3. "Create new project" click karo
4. **2-3 minute wait karo** jab tak project ready ho

### 3.3 Apni Keys Dhundo

Project ready hone ke baad:

1. Left sidebar mein **Settings** (⚙️) click karo
2. **API** click karo
3. Yeh do cheezein copy karo:
   - **Project URL** → `https://xxxxx.supabase.co` jaise dikhega
   - **anon / public** key → bahut lamba text

> ⚠️ **KABHI SHARE MAT KARO:**
> - `service_role` key
> - Database password
> - Yeh sirf aapke paas rehni chahiye

---

## 4. Step 2: Database Schema Run Karo

### 4.1 SQL Editor Kholo

1. Supabase dashboard mein left sidebar mein **SQL Editor** click karo (</> icon)
2. "New query" click karo

### 4.2 Schema File Copy Karo

1. Apne computer pe `supabase-schema.sql` file kholo (Notepad ya VS Code se)
2. Saara content select karo (Ctrl+A)
3. Copy karo (Ctrl+C)
4. Supabase SQL Editor mein paste karo (Ctrl+V)

### 4.3 Run Karo

1. **"Run"** button click karo (ya F5 press karo)
2. Neeche "Success. No rows returned." ya similar message aani chahiye
3. Agar koi error aaye → Step 12 (Troubleshooting) dekhein

**Kya hoga:**
- 5 tables create honge (products, categories, stores, product_affiliate_links, admin_roles)
- Security policies set honge
- Default stores (Amazon, Flipkart, etc.) add honge
- Default categories add honge

---

## 5. Step 3: Pehla Admin User Banao

> ⚠️ **Yeh VERY IMPORTANT security step hai.** Normal signup se admin access nahi milta.
> Admin role manually assign karna padta hai.

### 5.1 Auth User Banao

1. Supabase dashboard → **Authentication** (👤 icon) → **Users**
2. **"Add user"** → **"Create new user"** click karo
3. Bharo:
   - **Email:** `admin@yourdomain.com` (apna email)
   - **Password:** strong password (8+ characters, numbers, symbols)
   - **"Auto Confirm User"** checkbox ON rakho
4. **"Create user"** click karo
5. User create hone ke baad uska **User ID (UUID)** copy karo
   - Yeh kuch aisa dikhega: `550e8400-e29b-41d4-a716-446655440000`

### 5.2 Admin Role Assign Karo

1. SQL Editor mein **New Query** click karo
2. Yeh SQL paste karo aur **APNA USER ID** daalo:

```sql
-- ⚠️ IMPORTANT: 'YOUR-USER-ID-HERE' ki jagah Step 5.1 wala UUID daalo
INSERT INTO public.admin_roles (user_id, role)
VALUES ('YOUR-USER-ID-HERE', 'admin');
```

**Example (real UUID ke saath):**
```sql
INSERT INTO public.admin_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'admin');
```

3. **Run** click karo
4. "1 row affected" jaise message aana chahiye

### 5.3 Verify Karo

```sql
-- Check karo ki admin role sahi set hua
SELECT ar.role, au.email, ar.created_at
FROM public.admin_roles ar
JOIN auth.users au ON ar.user_id = au.id;
```

Is query ka result mein aapka email aur role "admin" dikhna chahiye.

---

## 6. Step 4: Config File Update Karo

### 6.1 `supabase-config.js` File Kholo

Apne computer pe `supabase-config.js` file kholo (Notepad, VS Code, ya koi bhi editor se).

### 6.2 Apni Values Daalo

File mein yeh do lines dhundo aur update karo:

```javascript
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY_HERE';
```

**Inhe replace karo:**

```javascript
const SUPABASE_URL  = 'https://abcdefghijkl.supabase.co';    // ← apna URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX...'; // ← apni anon key
```

> ✅ **Safe hai:** `anon` key public ho sakti hai — yeh read-only access deti hai.
> Security RLS policies handle karti hai.
>
> ❌ **KABHI NAHI:** `service_role` key yahan mat daalo.

### 6.3 File Save Karo

Ctrl+S press karo.

---

## 7. Step 5: GitHub Pages pe Deploy Karo

### 7.1 GitHub Account

1. **https://github.com** pe jao
2. Account nahi hai to banao (free hai)

### 7.2 New Repository Banao

1. "+" icon → "New repository"
2. Repository name: `dealkhoj` (ya `DealKhoj`)
3. **Public** select karo (GitHub Pages ke liye)
4. "Create repository" click karo

### 7.3 Files Upload Karo

**Method 1: GitHub Web Interface (easiest for beginners)**

1. Repository page pe "uploading an existing file" link click karo
2. Apni DealKhoj folder se **saari files** drag and drop karo:
   - `index.html`
   - `style.css`
   - `script.js`
   - `admin.html`
   - `admin.css`
   - `admin.js`
   - `supabase-config.js`
   - `supabase-schema.sql`
   - `README-ADMIN-HINGLISH.md`
3. Neeche "Commit changes" click karo

**Method 2: Git (agar Git installed hai)**

```bash
cd C:\Users\sives\DealKhoj
git init
git add .
git commit -m "Initial DealKhoj commit"
git remote add origin https://github.com/APKA-USERNAME/dealkhoj.git
git push -u origin main
```

### 7.4 GitHub Pages Enable Karo

1. Repository → **Settings** tab
2. Left sidebar → **Pages**
3. Source: **"Deploy from a branch"**
4. Branch: **main** → folder: **/ (root)**
5. **Save** click karo
6. 2-3 minute wait karo
7. Page refresh karo → URL dikhega: `https://APKA-USERNAME.github.io/dealkhoj/`

### 7.5 Supabase mein Site URL Add Karo

**IMPORTANT:** Supabase ko batana padega ki kahan se requests aayengi.

1. Supabase → **Authentication** → **URL Configuration**
2. **Site URL** daalo: `https://APKA-USERNAME.github.io/dealkhoj`
3. **Redirect URLs** mein add karo:
   - `https://APKA-USERNAME.github.io/dealkhoj`
   - `https://APKA-USERNAME.github.io/dealkhoj/admin.html`
4. **Save** click karo

---

## 8. Admin Panel Use Karna

### 8.1 Admin Panel Kholna

Browser mein jao: `https://APKA-USERNAME.github.io/dealkhoj/admin.html`

### 8.2 Login Karna

- **Email:** Step 5.1 wala email
- **Password:** Step 5.1 wala password
- **"Sign In"** click karo

### 8.3 Dashboard Dekhna

Login ke baad Dashboard dikhega jahan:
- Total products count
- Published vs Draft count
- Active categories aur stores
- Recently added products

---

## 9. Products Manage Karna

### 9.1 Naya Product Add Karna

1. Left sidebar → **Add Product** click karo
2. Form bharo:

| Field | Kya Daalna Hai |
|-------|----------------|
| Product Name | Pura product naam (accurate) |
| URL Slug | Auto-generate hota hai, ya khud likho |
| Description | Product ki accurate description |
| Category | Dropdown se select karo |
| Selling Price | Current selling price (₹ mein) |
| Original/MRP | Original price jo struck-through dikhegi |
| Image URL | Product image ka direct link |
| Badge | Best Deal, Trending, etc. |
| Stock Status | In Stock / Out of Stock / Limited |
| Featured | ⭐ featured products prominently dikhte hain |
| Publish | ON = website pe dikhega, OFF = draft |
| Affiliate URLs | Har store ke liye apna affiliate link |

3. **Save Product** click karo

> ⚠️ **IMPORTANT:** Sirf accurate prices daalo. Kabhi fabricated prices mat daalo.

### 9.2 Products List Dekhna

**All Products** page pe:
- Search bar mein naam type karo
- Category filter use karo
- Status filter (Published/Draft)
- Sort karo (newest, price, name)

### 9.3 Product Edit Karna

Products table mein product ke saamne **✏️** button click karo.

### 9.4 Publish/Unpublish Karna

- **📢** button = Draft product ko publish karo
- **📤** button = Published product ko unpublish (draft mein) karo

### 9.5 Product Delete Karna

**🗑️** button click karo → Confirmation dialog aayega → "Haan, Delete Karo" click karo.

---

## 10. Affiliate Links Setup Karna

### 10.1 Affiliate Account Banao (External)

> ⚠️ Yeh DealKhoj ke bahar ka process hai. Har store ka alag affiliate program hai.

| Store | Affiliate Program URL |
|-------|----------------------|
| Amazon | https://affiliate-program.amazon.in |
| Flipkart | https://affiliate.flipkart.com |
| Meesho | https://affiliate.meesho.com |
| Myntra | https://www.myntra.com/affiliate |

### 10.2 Affiliate Link Kaise Milta Hai

1. Affiliate account mein login karo
2. Product search karo
3. "Get Link" ya "Generate Link" click karo
4. Aapko ek URL milega jaise:
   - Amazon: `https://amzn.to/3XXXXXXX`
   - Flipkart: `https://fktr.in/XXXXXXX`

### 10.3 Link Admin Panel Mein Daalo

1. Admin → **Add/Edit Product**
2. Affiliate Links section mein store ke samne URL paste karo
3. Save karo

> ✅ **DealKhoj automatically sahi link use karta hai** jab visitor "Buy on Amazon" click karta hai.

---

## 11. Security Notes

| Security Feature | Kaise Implement Hua |
|-----------------|---------------------|
| Admin auth | Supabase Auth + admin_roles table check |
| Public can't see drafts | PostgreSQL RLS policy |
| Admin role client pe trust nahi | Server-side `is_admin()` function |
| XSS prevention | `escapeHtml()` function, no innerHTML with user data |
| URL validation | `sanitizeUrl()` — javascript: URLs reject |
| No service_role in code | Sirf `anon` key use hoti hai |
| Admin registration blocked | Koi public signup nahi |
| Negative prices blocked | Database CHECK constraint |

**Known Limitations (Static Hosting):**
1. Config file (`supabase-config.js`) GitHub pe public hai — isliye sirf `anon` key rakho
2. Rate limiting Supabase handle karta hai
3. Real-time price sync possible nahi — prices manually update karne padte hain

---

## 12. Troubleshooting

### "Supabase configure nahi hua" error

→ `supabase-config.js` mein URL aur Key check karo

### "Admin access nahi hai" error

→ Step 5.2 — admin_roles table mein apna user_id add kiya ya nahi?

### Products website pe nahi dikh rahe

→ Products "Published" hain ya nahi? Admin panel mein check karo.

### Login ke baad redirect nahi ho raha

→ Supabase → Authentication → URL Configuration mein site URL add karo (Step 7.5)

### "Network error" ya "Failed to fetch"

→ Internet connection check karo. Supabase project active hai ya nahi (https://supabase.com dashboard check karo)

### GitHub Pages pe CSS kaam nahi kar raha

→ Saari files root folder mein hain ya nahi check karo (kisi subfolder mein nahi)

### Slug already exists error

→ Koi dusra product same slug use kar raha hai. Slug change karo.

### Image nahi dikh rahi

→ Image URL direct link hona chahiye (`.jpg`, `.png`, `.webp` pe end hona chahiye usually)
→ URL `https://` se shuru hona chahiye

---

## 13. Limitations

1. **Price Sync**: DealKhoj automatically live prices fetch nahi karta. Prices manually update karne honge.

2. **Click Tracking**: Is version mein affiliate clicks count nahi hote. Future version mein Supabase Edge Functions se ho sakta hai.

3. **Image Upload**: Is version mein Supabase Storage integration nahi hai — image URLs paste karne padte hain.

4. **Multiple Admins**: SQL Editor se multiple admins add kar sakte ho (Step 5.2 dobara run karo different user_id se).

5. **HTTPS Only**: GitHub Pages automatically HTTPS deta hai, to yeh issue nahi hoga.

6. **Supabase Free Tier**: 500MB database, 2GB bandwidth, 50,000 MAU — DealKhoj ke liye kaafi hai initially.

---

## 📞 Quick Reference Card

```
Admin Panel URL:  https://APKA-USERNAME.github.io/dealkhoj/admin.html
Public Site URL:  https://APKA-USERNAME.github.io/dealkhoj/
Supabase Dashboard: https://supabase.com/dashboard

Config File:   supabase-config.js
Schema File:   supabase-schema.sql (run once in Supabase SQL Editor)
```

---

*DealKhoj Admin Panel — Built with ❤️ for Indian affiliate marketers*
*Last updated: 2025*

