# Elite Scholar Android App - Setup Guide

## 📦 What You Have

✅ **Auto-update system** - App checks for updates on startup
✅ **Signed APK** - Ready for distribution  
✅ **Custom logo** - Elite Scholar branding
✅ **Version tracking** - Automatic version management

---

## 🚀 GitHub Setup (One-time)

### 1. Initialize Git Repository

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-ui/android
git init
git add .
git commit -m "Initial commit: Elite Scholar Android v1.0.0"
git branch -M main
git remote add origin https://github.com/eliteedtech1-debug/elitescholar.app.git
git push -u origin main
```

### 2. Create First Release

1. Go to: https://github.com/eliteedtech1-debug/elitescholar.app/releases/new
2. Fill in:
   - **Tag version:** `v1.0.0`
   - **Release title:** `Elite Scholar v1.0.0`
   - **Description:** `Initial release with Elite Scholar logo`
3. Upload `EliteScholar-v1.0.0.apk` from Desktop
4. Click "Publish release"

### 3. Upload version.json

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-ui
git add public/version.json android/README.md
git commit -m "Add version manifest and README"
git push origin main
```

---

## 🔄 Releasing Updates (Future)

### Step 1: Update Version Numbers

Edit `/Users/apple/Downloads/apps/elite/elscholar-ui/src/utils/appUpdater.ts`:
```typescript
const CURRENT_VERSION = '1.0.1';  // Change this
const CURRENT_VERSION_CODE = 2;    // Increment this
```

Edit `/Users/apple/Downloads/apps/elite/elscholar-ui/android/app/build.gradle`:
```gradle
versionCode 2        // Increment
versionName "1.0.1"  // Update
```

### Step 2: Build New APK

```bash
cd /Users/apple/Downloads/apps/elite/elscholar-ui
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ~/Desktop/EliteScholar-v1.0.1.apk
```

### Step 3: Create GitHub Release

1. Go to: https://github.com/eliteedtech1-debug/elitescholar.app/releases/new
2. Tag: `v1.0.1`
3. Upload `EliteScholar-v1.0.1.apk`
4. Publish

### Step 4: Update version.json

Edit `/Users/apple/Downloads/apps/elite/elscholar-ui/public/version.json`:
```json
{
  "version": "1.0.1",
  "versionCode": 2,
  "apkUrl": "https://github.com/eliteedtech1-debug/elitescholar.app/releases/download/v1.0.1/EliteScholar.apk",
  "releaseNotes": "Bug fixes and improvements",
  "forceUpdate": false
}
```

Push to GitHub:
```bash
git add public/version.json
git commit -m "Update to v1.0.1"
git push origin main
```

### Step 5: Users Auto-Update

- Users open the app
- App checks version.json
- Prompt appears: "New version 1.0.1 available!"
- User taps "Update"
- APK downloads from GitHub
- User installs new version

---

## 📱 Distribution

**Share this link with users:**
```
https://github.com/eliteedtech1-debug/elitescholar.app/releases/latest
```

Or create a short link:
```
bit.ly/elitescholar-app
```

---

## 🔧 Files to Track

**Always commit these when updating:**
- `public/version.json` - Version manifest
- `src/utils/appUpdater.ts` - Version constants
- `android/app/build.gradle` - APK version
- `android/README.md` - User documentation

---

## ⚙️ Configuration

**Current Settings:**
- Package: `ng.elitescholar.lms`
- Min SDK: 23 (Android 6.0+)
- Target SDK: 35 (Android 15)
- Compile SDK: 36
- Keystore: `android/elite-release.keystore`
- Auto-update: Enabled (checks on app startup)

---

## 🐛 Troubleshooting

**"Invalid package" on device:**
- Uninstall old version first
- Enable "Install from unknown sources"
- Use ADB: `adb install -r app-release.apk`

**Update not showing:**
- Check version.json is accessible
- Verify versionCode is incremented
- Check device has internet connection

**Build fails:**
- Run `./gradlew clean`
- Delete `android/app/build` folder
- Rebuild

---

## 📞 Support

For issues: support@elitescholar.ng
