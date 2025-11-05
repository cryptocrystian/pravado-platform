# Pravado Mobile App Assets

This directory contains all visual and audio assets required for the Pravado mobile app.

**Sprint 76 - Track A: Mobile App Store Readiness**

## Required Assets

The following assets must be created before app store submission:

### 1. App Icon (`icon.png`)

**Specifications:**
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Color Mode: RGB
- Design: Pravado logo on solid background or gradient
- Usage: Main app icon for iOS and Android

**Design Guidelines:**
- Use Pravado brand colors (primary: #3B82F6 blue)
- Ensure icon is recognizable at small sizes (down to 40x40)
- Avoid text or fine details that won't be visible when scaled
- Test on both light and dark backgrounds

**Tool Recommendations:**
- Figma, Adobe Illustrator, or Sketch for vector design
- Export at 1024x1024 for highest quality

---

### 2. Splash Screen (`splash.png`)

**Specifications:**
- Size: 1284x2778 pixels (iPhone 13 Pro Max resolution)
- Format: PNG
- Background Color: #FFFFFF (white) or brand color
- Design: Pravado logo centered with tagline

**Design Guidelines:**
- Keep logo centered vertically and horizontally
- Use safe area to avoid notch/status bar overlap
- Background color should match `app.json` backgroundColor setting
- Test on both iPhone and Android device simulators

**Current Configuration:**
```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#ffffff"
}
```

---

### 3. Android Adaptive Icon (`adaptive-icon.png`)

**Specifications:**
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Safe Zone: Keep important elements within 66% center circle
- Usage: Android adaptive icon foreground layer

**Design Guidelines:**
- Android will mask this icon into various shapes (circle, square, squircle)
- Keep logo/icon elements within the safe zone (66% center circle = 684x684 area)
- Outer 33% may be cropped on some devices
- Test with different Android icon shapes

**Current Configuration:**
```json
"adaptiveIcon": {
  "foregroundImage": "./assets/adaptive-icon.png",
  "backgroundColor": "#ffffff"
}
```

---

### 4. Notification Icon (`notification-icon.png`)

**Specifications:**
- Size: 96x96 pixels (xxxhdpi density)
- Format: PNG with transparency
- Style: Silhouette/monochrome design
- Color: White icon on transparent background

**Design Guidelines:**
- Android notifications use tinted icons (color specified in app.json)
- Icon should be simple silhouette of Pravado logo
- Use only white color with transparency
- Test in notification drawer on dark/light themes

**Current Configuration:**
```json
"notification": {
  "icon": "./assets/notification-icon.png",
  "color": "#3B82F6"
}
```

**Color Explanation:**
- The icon image should be white (#FFFFFF)
- Android will apply the `color` tint (#3B82F6) automatically
- This ensures consistent branding in notification drawer

---

### 5. Web Favicon (`favicon.png`)

**Specifications:**
- Size: 48x48 pixels (or 64x64 for higher quality)
- Format: PNG
- Design: Simplified Pravado icon/logo

**Usage:**
- Displayed when app is added to browser bookmarks
- Used in browser tabs when running as PWA
- Should be recognizable at very small sizes

---

### 6. Notification Sound (`notification-sound.wav`)

**Specifications:**
- Format: WAV (uncompressed) or MP3
- Duration: 1-3 seconds
- Volume: Normalized to -3dB peak
- Sample Rate: 44.1kHz or 48kHz

**Design Guidelines:**
- Keep sound subtle and non-intrusive
- Align with Pravado brand personality (professional, trustworthy)
- Test at different device volumes
- Ensure sound is distinct from system default

**Alternative:**
- Can be omitted to use device default notification sound
- Remove from `app.json` if not using custom sound

---

## Asset Generation Workflow

### Option 1: Design Tools

1. Create designs in Figma/Sketch/Illustrator
2. Export at required sizes
3. Optimize PNG files with ImageOptim or TinyPNG
4. Place files in this directory

### Option 2: Expo Asset Generator

Use Expo's asset generator to create all icon sizes from a single source:

```bash
npx expo-asset-generator --icon path/to/icon.png
```

This will generate all required icon sizes for iOS and Android.

### Option 3: Online Tools

- **App Icon Generator**: https://www.appicon.co/
- **Adaptive Icon Preview**: https://adapticon.tooo.io/
- **Favicon Generator**: https://realfavicongenerator.net/

---

## Verification Checklist

Before app store submission, verify:

- [ ] `icon.png` is 1024x1024 and looks good when scaled down
- [ ] `splash.png` displays correctly on iPhone and Android simulators
- [ ] `adaptive-icon.png` works with all Android icon shapes (circle, square, rounded square)
- [ ] `notification-icon.png` is monochrome silhouette (white on transparent)
- [ ] `favicon.png` is recognizable at small size (48x48 or smaller)
- [ ] `notification-sound.wav` plays correctly and is not too loud/jarring
- [ ] All assets follow Pravado brand guidelines
- [ ] Assets are optimized for file size (use compression tools)

---

## Current Status

**Status:** ⚠️ ASSETS NOT YET CREATED

**Action Required:**
1. Work with design team to create assets following specifications above
2. Place assets in this directory with exact filenames
3. Test on iOS and Android devices
4. Update this README status to "✅ COMPLETE" when done

---

## References

- Expo Asset Documentation: https://docs.expo.dev/develop/user-interface/assets/
- iOS App Icon Guidelines: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Android Adaptive Icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/

---

## Notes

- This README was generated as part of Sprint 76 Track A: Mobile App Store Readiness
- Asset specifications are based on Expo 50 and current iOS/Android requirements
- All files should be committed to git once created
- Use `.gitignore` to exclude large source files (e.g., .psd, .sketch, .fig)
