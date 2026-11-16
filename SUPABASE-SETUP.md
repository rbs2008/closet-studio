# Enable cross-device sync

Closet Studio is a static GitHub Pages app. Supabase provides email/password sign-in, a private database row per account, and a private bucket for compressed wardrobe photos. The browser uses only the project's public publishable key; row-level security and storage policies restrict data to its signed-in owner.

## Create and configure a Supabase project

1. Create a Supabase project. Its free plan has usage limits; check Supabase's current pricing and limits before relying on it for commercial use.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the sync table, a private photo bucket, and owner-only RLS policies.
3. In **Project Settings → API**, copy the **Project URL** and **publishable key** (or legacy `anon` key). Never use or publish a `service_role` or secret key in this browser app.
4. Put the URL and publishable key in [`supabase-config.js`](./supabase-config.js), replacing the empty strings.
5. In **Authentication → URL Configuration**, set the Site URL to `https://rbs2008.github.io/closet-studio/` and add `https://rbs2008.github.io/closet-studio/**` to the allowed redirect URLs.
6. In **Authentication → Providers → Email**, keep email/password enabled. Email confirmation is recommended. Make sure your confirmation email redirects to the allowed Closet Studio URL.
7. Publish the updated `supabase-config.js` and app files to GitHub Pages. The URL and publishable key are public client configuration; the database and storage must remain protected by the included policies.

## Use sync

Choose **Create account** or **Sign in** in Closet Studio and use the same verified email and password on each device. On first sign-in, the app merges the existing local wardrobe with the account's cloud wardrobe. New and edited pieces, favorites, appearance, preferences, and compressed images are then synced. Keep the app open and online until the initial upload finishes.

Photos and wardrobe data are uploaded to the Supabase project you configure; they are no longer device-only. Local browser copies remain for offline use. The current static app does not automatically delete a Supabase Auth account; remove account data through the Supabase dashboard before deleting the project.
