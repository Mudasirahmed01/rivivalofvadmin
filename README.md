# REVIVAL OF V Admin Dashboard

This is a standalone, responsive web app for store administration. It has its own source, services and deployment, while connecting to the same Supabase and Cloudinary accounts as the customer storefront.

## Local run

From this folder:

```cmd
npm install
copy .env.example .env
npm run dev
```

Set the four public client variables in `.env`. The Supabase account must have `app_metadata.role` set to `admin`. Run the database SQL migrations from the customer-store repository once before using the admin app.

## Vercel deployment

Create a separate GitHub repository for this folder, for example `rivivalofvadmin`. In CMD, from the customer repository root:

```cmd
cd /d "C:\path\to\workspace (2)\admin-dashboard"
git init
git add .
git commit -m "Initial standalone admin dashboard"
git branch -M main
git remote add origin https://github.com/USERNAME/rivivalofvadmin.git
git push -u origin main
```

Use your actual GitHub username and email/name in Git config. Then create a separate Vercel project by importing this admin-only GitHub repository. Vercel detects Vite; use build command `npm run build` and output directory `dist`.

Add these Environment Variables in the Vercel project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

Do not add Supabase service-role, Cloudinary API secret, or Resend secret to Vercel frontend variables.

The admin and customer sites are in separate GitHub repositories and separate Vercel projects. They can later receive separate domains while sharing the same Supabase project and Cloudinary cloud.
