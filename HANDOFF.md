# Run your own copy of Swaply

This is everything you need to clone Swaply, run it, and ship your *own* version
(your own backend URL, your own app in your own App Store account). Nothing here
contains secrets — the backend generates its tokens at runtime and stores data in a
gitignored `data/` folder.

## What's in the box
- **Backend** — `server.js`: a small Node/Express API + a JSON file store (no database
  to set up). Serves the web app and records swaps.
- **Web app / app UI** — `public/`: plain HTML/CSS/JS. Same files run on the web and
  inside the native app.
- **iOS app** — `ios/`: a Capacitor wrapper around `public/` that talks to the backend.
- **Store assets** — `store/`: screenshot generator, listing copy, export options.

## Prerequisites
- **Node 22+** and **Git**
- A **Render** account (or any host that runs Node with a persistent disk) for the backend
- For the iOS app: a **Mac with full Xcode**, an Apple ID (free to run on your own iPhone;
  **$99/yr Apple Developer Program** only needed for TestFlight / the App Store)

## 1. Clone and run locally
```bash
git clone https://github.com/Ericstcashen/instaswap.git
cd instaswap
npm install
npm start            # → http://localhost:3000
```
Open it, create a code, and open the `/?u=…` link in another browser to test a swap.

## 2. Deploy your own backend
Render reads `render.yaml` automatically:
1. dashboard.render.com → **New → Blueprint** → connect your fork of this repo → **Apply**
2. Start on the **free** plan to test; switch `render.yaml` to `plan: starter` + the disk
   block (already in the file's comments) when you want swaps to persist.
3. Note your URL, e.g. `https://YOURAPP.onrender.com`

> Not using Render? Any Node host works: `npm ci && npm start`, set `INSTASWAP_DATA_DIR`
> to a path on a persistent volume so data survives restarts.

## 3. Point the app at YOUR backend
Edit **`public/config.js`** — change `PUBLIC_URL` to your Render URL. Commit + redeploy.
(That one constant controls both the API calls and the QR/share links.)

## 4. Make it your own iOS app
1. Edit **`capacitor.config.ts`** → set `appId` to your own reverse-domain
   (e.g. `com.yourname.swaply`) and `appName`.
2. `npx cap sync ios`
3. `open ios/App/App.xcodeproj` → select the **App** target → **Signing & Capabilities**
   → check *Automatically manage signing* → pick **your** Team. Change the bundle id to match.
4. Pick your iPhone or a simulator and hit **Run**.

## 5. Rebrand (optional)
- **Icon:** edit `assets/logo.svg` → `node scripts/render-assets.mjs` →
  `npx @capacitor/assets generate --ios`
- **Colors:** the `:root` gradient tokens in `public/style.css`
- **Name:** search-and-replace `Swaply`
- **Contact:** `public/privacy.html` and `public/support.html` (swap in your email)

## 6. Ship to the App Store (your account)
- **Upload a build** (no Xcode Organizer needed — this is the reliable path):
  ```bash
  xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
    -destination 'generic/platform=iOS' -archivePath ios/build/App.xcarchive \
    -allowProvisioningUpdates archive
  # set teamID in store/exportOptions.plist to YOUR team, then:
  xcodebuild -exportArchive -archivePath ios/build/App.xcarchive \
    -exportOptionsPlist store/exportOptions.plist -allowProvisioningUpdates
  ```
- **Screenshots:** `node store/make-screens.mjs` then render with headless Chrome
  (see the commands in `store/make-screens.mjs` header) — outputs the App-Store sizes.
- **Listing copy:** `store/listing.md`. Create the app in App Store Connect, fill it in,
  attach the build, submit.

## Gotchas we already hit (so you don't)
- Capacitor 8 uses **Swift Package Manager**, and the ML Kit scanner plugin isn't
  SPM-compatible — that's why scanning is done in-webview with **jsQR** (`public/app.js`).
- Right after enrolling in the Apple Developer Program, Xcode's Organizer may show a stale
  "Personal Team not enrolled" error. The CLI upload in step 6 sidesteps it entirely.
- Don't name the app anything starting with **"Insta"** — Meta trademark, likely rejection.
