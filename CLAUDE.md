## ⛔ BUG FIX PROCESS — MANDATORY

The same bugs have returned across 7 builds. These process rules are now mandatory.

### ONE BUG AT A TIME
- Fix ONE bug → prove it → commit → next bug
- NEVER batch 10+ fixes. Each fix = separate commit
- Commit message format: `fix: [exact description of what was broken and how it's fixed]`

### PROVE THE FIX — NO ✅ WITHOUT EVIDENCE
After every fix, you MUST do one of:
1. Show BEFORE and AFTER code with explanation of why the bug is gone
2. Trace the full user flow through the code proving the bug path is eliminated
3. Run a test that covers the scenario

If you cannot prove: say "I changed X but cannot fully verify without a device test. Here's my reasoning: [...]"

**NEVER write "Fixed", "Done", or "✅" without proof.**

### BEFORE EDITING — READ THE FILE FIRST
1. `cat` the FULL file you're about to edit
2. Find the exact function/component
3. Understand current state
4. Only then make the change

Editing from memory = #1 source of regressions.

### AFTER EDITING — CHECK SIDE EFFECTS
```bash
grep -r "ChangedComponentOrFunction" src/ --include="*.tsx" --include="*.ts"
```
If other files import what you changed, verify they still work.

### STUCK AFTER 2 ATTEMPTS?
1. STOP the same approach
2. Say: "Tried X and Y, neither worked because Z"
3. Propose a different approach
4. Ask before implementing

### BUILD READINESS CHECKLIST
Before saying "ready for build":
- [ ] Every fix has a separate descriptive commit
- [ ] No Pressable components use callback-style styling
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] All imports resolve (no missing modules)
- [ ] Each recurring bug has a code-path trace proving it's fixed

---

# CLAUDE.md — DocLear Mobile App (Expo)

## Project
- DocLear — AI document analysis app (scan, analyze, chat)
- Expo SDK 55, React Native, TypeScript
- Backend: doclear.app (Next.js + Supabase + Claude API)
- Supabase project: cklxkdujzpdkgbsxaikz (with L, not B)

## Stack
- Expo Router (file-based routing)
- Zustand (state management)
- Supabase Auth (anonymous + email + Apple Sign-In)
- RevenueCat (subscriptions — test key for now)
- react-native-reanimated (animations)
- NativeWind + Tailwind (styling, but mostly inline styles)
- i18n: react-i18next (fr, en, ru + 7 more)

## Design Rules — DO NOT VIOLATE

### Colors
- Primary / CTA: #1E293B (dark slate)
- Background: #FFFFFF
- Surface / cards: #F8FAFC
- Border: #E5E7EB
- Text primary: #0F172A
- Text secondary: #64748B
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444
- Tab active: #1E293B
- Tab inactive: #94A3B8
- Loading rings: #4F46E5

### No Emojis in UI
- Use Ionicons for all icons (camera-outline, images-outline, attach-outline, etc.)
- Emojis only in data content (AI responses), never in buttons or navigation

### Buttons — CRITICAL
- Button.tsx uses PLAIN style object, NOT Pressable callback `style={({pressed}) => ...}`
- On iOS, Pressable style callbacks sometimes don't render backgroundColor
- ALL primary buttons: bg #1E293B, text #FFFFFF, height 52px, borderRadius 12
- ALL secondary buttons: bg #FFFFFF, border #E5E7EB, text #1E293B
- NEVER create a button with transparent/invisible text
- Test every button visually before claiming "fixed"

### Cards
- borderRadius: 12
- shadow on iOS, elevation on Android
- Background: #FFFFFF
- Border: none (shadow provides depth)

## Auth Rules — CRITICAL

### Anonymous → Registered
- App starts with anonymous sign-in (supabase.auth.signInAnonymously())
- When anonymous user registers: use `supabase.auth.updateUser({email, password})`
- DO NOT use `signUp()` for anonymous users — it creates a NEW user and loses all documents
- `updateUser()` preserves the same user_id and all associated data

### Apple Sign-In
- Black background, white text, Apple logo (Ionicons logo-apple)
- Per Apple Human Interface Guidelines — Apple WILL reject non-compliant buttons
- Use expo-apple-authentication + supabase.auth.signInWithIdToken()

### Google Sign-In
- Currently removed (was showing "coming soon" — unprofessional)
- Email + Apple is sufficient for Apple Review
- Add Google later with proper OAuth setup

### Auth Flow
- Welcome screen (first launch only, MMKV check) → Onboarding → Anonymous auth → Tabs
- Login: Apple Sign-In + Email/Password
- Register: updateUser() for anonymous, signUp() for fresh users
- After registration: auto-redirect to /(tabs) if session exists
- onAuthStateChange in AuthProvider handles all state updates

## Pricing Model
- Anonymous: 3 documents free (FREE_DOC_LIMIT = 3)
- Registration: auto 7-day Pro trial (TRIAL_DAYS = 7)
- After trial: free (3 docs/month) unless subscribed
- Pro monthly: EUR 9.99
- Pro annual: EUR 69.99 (save 42%)
- No Lifetime plan
- RevenueCat manages subscriptions

## AI Consent Flow
- Before first analysis: redirect to /ai-consent
- Save pending files in AsyncStorage BEFORE redirect
- After consent: restore files from AsyncStorage → auto-start analysis
- router.back() can lose component state on iOS — always persist pending data

## Onboarding
- 5 steps: Language → Country → Status → Use Case → Ready
- PagerView for swipe navigation
- Buttons "Next" on EVERY step — NOT position:absolute (broken in PagerView on iOS)
- Use normal flex layout: ScrollView (flex:1) + Button at bottom
- Last step: "Skip" → "Start" (changes label)
- MMKV stores onboarding_done — show only once

## Loading Screen (Scan Analysis)
- Animated pulse rings (react-native-reanimated) + document icon center
- Rotating text every 2.5s: "Reading..." → "Analyzing..." → "Preparing..."
- Subtext: "Usually takes 10-20 seconds"
- NO checkboxes, NO step list, NO progress bar

## Document Detail
- 12 sections in order: Title, Health Score, What Is This, What It Says, What To Do, Key Facts, Risk Flags, Positive Points, Deadline+Reminders, Specialist (Google Maps), Translation (inline), Ask Question (sticky)
- paddingBottom: 120 (sticky button doesn't cover content)
- Chat title = document title (not "Chat with document")
- Thinking indicator: "..." (three dots, not "DocLear thinks...")

## Translation
- Inline in Document Detail (NOT via chat modal)
- Takes doc.rawText (original), not analysis
- Shows in accordion block under translate button
- Cached in state — instant on repeat
- Hidden if doc.language === user locale
- Included in PDF export

## Google Maps Specialist
- Filter: specialistType !== "none" && !== "null" && !== undefined
- Fallback to docTypeLabel for search query
- Uses https://www.google.com/maps/search/ (HTTPS, not deeplink)
- Include user city from Supabase profiles

## PDF Export
- Include ALL sections (not just summary + key facts)
- Sections: Title, Health Score, What Is This, What It Says, What To Do, Summary, Key Facts, Risk Flags, Positive Points, Deadline, Recommendations, Translation
- HTML template with proper styling

## Chat
- System hint appended: "Answer concisely, 2-3 paragraphs, don't repeat"
- streamChat sends documentId — backend loads full rawText from Supabase
- rawText supports up to ~100K characters (50+ pages)

## Common Mistakes — DO NOT REPEAT
1. Pressable style callback on iOS — use plain style objects
2. position:absolute inside PagerView — doesn't work on iOS
3. signUp() for anonymous users — loses documents, use updateUser()
4. "Coming soon" in production — remove feature or implement it
5. Emojis in buttons — use Ionicons
6. Claiming fix without testing — always verify the fix is in the build
7. English text in localized app — all UI text through i18n
8. RevenueCat test key crashes app — skip initialization for test_ keys

## i18n — Known Issues
- Arabic (ar.json) is INCOMPLETE — many keys missing, falls back to English
- RTL layout not implemented (needs I18nManager.forceRTL for Arabic)
- All 10 locale files need audit for missing keys before App Store submit
- Priority: fr, en, ru (complete) > de, es, it, pt, tr (partial) > ar, zh (incomplete)

## Build
- EAS Build: `npx eas build --platform ios --profile preview` (internal distribution)
- Production: `npx eas build --platform ios --profile production`
- Bundle ID: app.doclear.mobile
- Sentry: temporarily removed from plugins (caused build failure)
- Apple Team: PT88KA7TD8 (Dmitrii Sergueev)
