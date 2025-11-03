# Pravado Mobile App

**Version:** 1.0.0
**Sprint:** 64 - Phase 6.1: Mobile App Foundation
**Platform:** React Native (Expo)

---

## 📱 Overview

The Pravado mobile app is a native iOS and Android client for the Pravado platform, providing users with seamless access to AI-powered PR and media outreach agents directly from their mobile devices.

**Key Features:**
- 🔐 Secure authentication with Supabase
- 💬 Real-time chat with AI agents
- 📱 Native iOS and Android support
- 🌙 Dark mode support (coming soon)
- 🔔 Push notifications
- ⚡ Optimized performance with React Native

---

## 🏗️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo** | ~50.0.0 | React Native framework and tooling |
| **React Native** | 0.73.2 | Native mobile UI framework |
| **TypeScript** | 5.3.3 | Type-safe JavaScript |
| **React Navigation** | 6.x | Navigation library |
| **React Native Paper** | 5.11.6 | Material Design UI components |
| **Supabase** | 2.39.0 | Authentication and backend |
| **Axios** | 1.6.5 | HTTP client |
| **Expo Secure Store** | ~12.8.0 | Encrypted credential storage |

---

## 📁 Project Structure

```
mobile/pravado-app/
├── App.tsx                    # App entry point with providers
├── app.json                   # Expo configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
├── .eslintrc.js               # ESLint rules
├── .prettierrc                # Prettier configuration
├── .env.example               # Environment variables template
│
├── src/
│   ├── screens/               # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── chat/
│   │   │   └── ChatScreen.tsx
│   │   ├── onboarding/
│   │   │   └── WelcomeScreen.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   │
│   ├── components/            # Reusable components
│   │   ├── common/
│   │   └── chat/
│   │       └── ChatMessage.tsx
│   │
│   ├── navigation/            # Navigation configuration
│   │   └── AppNavigator.tsx
│   │
│   ├── services/              # API and auth services
│   │   ├── api.ts             # API client
│   │   ├── auth.ts            # Auth service
│   │   └── supabase.ts        # Supabase client
│   │
│   ├── hooks/                 # Custom React hooks
│   │
│   ├── config/                # App configuration
│   │   └── index.ts
│   │
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   │
│   └── utils/                 # Utility functions
│       └── index.ts
│
└── assets/                    # Images, fonts, etc.
    ├── images/
    └── fonts/
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 9.x (or npm/yarn)
- **Expo CLI** (install with `npm install -g expo-cli`)
- **iOS Simulator** (macOS) or **Android Emulator**
- **Expo Go** app on your physical device (optional)

### Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobile/pravado-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```bash
   # Edit .env file
   API_URL=https://api.pravado.com
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Running the App

#### Start Development Server
```bash
pnpm start
```

This will start the Expo development server. You'll see options to:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on your phone

#### Run on iOS Simulator
```bash
pnpm ios
```

#### Run on Android Emulator
```bash
pnpm android
```

#### Run in Web Browser (for testing)
```bash
pnpm web
```

---

## 🔧 Development

### Type Checking
```bash
pnpm type-check
```

### Linting
```bash
# Check for errors
pnpm lint

# Auto-fix errors
pnpm lint:fix
```

### Formatting
```bash
pnpm format
```

### Running Tests
```bash
pnpm test
```

---

## 📦 Building for Production

### Prerequisites for Building

1. **Create Expo account:** https://expo.dev/signup

2. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

3. **Login to EAS:**
   ```bash
   eas login
   ```

4. **Configure EAS:**
   ```bash
   eas build:configure
   ```

### Build Android APK
```bash
pnpm build:android
```

Or with EAS CLI:
```bash
eas build --platform android
```

### Build iOS IPA
```bash
pnpm build:ios
```

Or with EAS CLI:
```bash
eas build --platform ios
```

### Submit to App Stores

**Google Play Store:**
```bash
eas submit --platform android
```

**Apple App Store:**
```bash
eas submit --platform ios
```

---

## 🔑 Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `API_URL` | Pravado API base URL | Yes | `https://api.pravado.com` |
| `SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOi...` |
| `API_TIMEOUT` | API request timeout (ms) | No | `10000` |
| `ENABLE_DEBUG` | Enable debug logging | No | `true` |
| `ENABLE_ANALYTICS` | Enable analytics | No | `false` |
| `SENTRY_DSN` | Sentry error tracking DSN | No | `https://...` |

---

## 🎨 Theming

The app uses React Native Paper's Material Design theming system.

**Current themes:**
- Light mode ✅
- Dark mode (coming soon)

**Customizing colors:**
Edit `src/config/index.ts` to modify the color palette.

---

## 📱 Features

### ✅ Implemented (Sprint 64 Phase 6.1)

#### Authentication
- [x] Email/password login
- [x] Email/password registration
- [x] Secure token storage with Expo Secure Store
- [x] Auto-login on app launch
- [x] Session management
- [x] Logout functionality

#### Agent Chat
- [x] Real-time messaging interface
- [x] Display user and agent messages
- [x] Send messages to agent
- [x] Load conversation history
- [x] Message timestamps
- [x] Optimistic UI updates
- [x] Error handling

#### Onboarding
- [x] Welcome screen
- [x] Simple onboarding flow

#### Settings
- [x] Theme toggle (UI ready)
- [x] Push notification toggle
- [x] Profile navigation (stubbed)
- [x] Privacy settings navigation (stubbed)
- [x] Help & support links
- [x] About information
- [x] Sign out

### 🔜 Coming Soon (Future Sprints)

- [ ] Agent selection (multiple agents)
- [ ] Dark mode implementation
- [ ] Push notifications backend integration
- [ ] Profile editing
- [ ] Voice input
- [ ] File attachments
- [ ] Conversation management (delete, archive)
- [ ] Offline mode
- [ ] Biometric authentication
- [ ] Deep linking
- [ ] Share conversations

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Can register with valid email/password
- [ ] Password validation works (8 chars, uppercase, number)
- [ ] Can log in with registered account
- [ ] Invalid credentials show error
- [ ] Token persists after app restart
- [ ] Can log out successfully

**Chat:**
- [ ] Can send messages
- [ ] Agent responds
- [ ] Messages display correctly
- [ ] Timestamps show
- [ ] Conversation history loads
- [ ] Scrolling works smoothly
- [ ] Keyboard behavior is correct

**Settings:**
- [ ] All toggles work
- [ ] Can navigate to settings screens
- [ ] Logout works
- [ ] Version number displays

**UI/UX:**
- [ ] Navigation is smooth
- [ ] No visual glitches
- [ ] Loading states show
- [ ] Error messages display
- [ ] Buttons are tappable
- [ ] Forms validate correctly

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** `Module not found` errors

**Solution:**
```bash
# Clear Expo cache
expo start -c

# Or manually clear
rm -rf node_modules
pnpm install
```

**Issue:** iOS simulator won't open

**Solution:**
```bash
# Open Xcode and accept license
sudo xcodebuild -license accept

# Restart Expo
pnpm start
```

**Issue:** Android emulator errors

**Solution:**
1. Open Android Studio
2. Go to AVD Manager
3. Create/start an emulator
4. Then run `pnpm android`

**Issue:** Supabase connection errors

**Solution:**
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
2. Check Supabase dashboard for project status
3. Ensure RLS policies allow anonymous access (for auth)

**Issue:** API connection errors

**Solution:**
1. Verify `API_URL` in `.env`
2. Ensure API is running and accessible
3. Check network connection
4. Review API CORS settings

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper](https://reactnativepaper.com/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

---

## 🤝 Contributing

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Keep components small and focused
- Write meaningful variable names
- Add comments for complex logic

### Commit Messages

Format: `Sprint 64 Phase 6.1: [Component] - [Description]`

Examples:
- `Sprint 64 Phase 6.1: Auth - Add login screen`
- `Sprint 64 Phase 6.1: Chat - Implement message history`
- `Sprint 64 Phase 6.1: Settings - Add theme toggle`

---

## 📄 License

MIT License - See main project LICENSE file

---

## 👥 Support

For issues or questions:
- Create an issue in the main Pravado repository
- Contact the development team
- Check the main project documentation

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
**Sprint:** 64 Phase 6.1
