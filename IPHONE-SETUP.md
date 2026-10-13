# Install Closet Studio on iPhone for free

Closet Studio can be installed as a Home Screen web app. This is not an App Store app; it opens in its own window from Safari and works offline after its first successful load.

## Publish it with GitHub Pages

1. Sign in to GitHub or create a free account.
2. Create a **public** repository named `ClosetStudio`.
3. Upload the contents of this folder to the repository root. Include `index.html`, `privacy-policy.html`, `closet-cover.svg`, `manifest.webmanifest`, and `service-worker.js`.
4. In the repository, open **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and `/ (root)`, then save.
5. Wait for GitHub Pages to publish. The address will be `https://YOUR-GITHUB-USERNAME.github.io/ClosetStudio/`.

## Add it to iPhone

1. Open the published address in **Safari** on the iPhone.
2. Tap **Share**, then **Add to Home Screen**.
3. Leave **Open as Web App** enabled if that option appears, then tap **Add**.
4. Launch Closet Studio from its new Home Screen icon. Open it once while online so the app shell can be cached for offline use.

The cover is an SVG icon. If your iOS version does not use SVG Home Screen icons, iOS may generate an icon from the page instead; the app can still be added and launched normally.

## Data and privacy

Wardrobe photos, item details, and the optional device-only profile are saved in browser storage on each device. Nothing syncs between the desktop and iPhone, so the iPhone starts with its own closet. Do not upload personal clothing photos to the GitHub repository; add them inside the app instead.

The privacy policy will be available at `https://YOUR-GITHUB-USERNAME.github.io/ClosetStudio/privacy-policy.html`. Use that public URL in App Store Connect only if you later submit an iOS app there. A GitHub Pages web app itself is not an App Store submission.
