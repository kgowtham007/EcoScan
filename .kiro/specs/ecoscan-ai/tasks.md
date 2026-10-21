# Implementation Plan: EcoScan AI

## Overview

Implementation follows a foundation-first order: project scaffolding and shared infrastructure first, then core AI classification, then gamification and social features, then IoT and offline support, and finally polish (performance, accessibility, animations). Each task builds on the previous, ending with full integration. Property-based tests are placed immediately after the component they validate to catch regressions early.

Tech stack: React.js 18 (frontend) · Node.js 20 + Express (API gateway) · Python 3.11 + FastAPI (classification service) · Firebase Auth + Firestore · Google Gemini Vision API · Workbox (offline) · fast-check (JS PBT) · Hypothesis (Python PBT).

---

## Tasks

- [x] 1. Project scaffolding and shared infrastructure
  - [x] 1.1 Initialize monorepo structure with three packages: `frontend` (Vite + React 18), `gateway` (Node.js + Express), `classifier` (Python FastAPI)
    - Set up `package.json` workspaces and `pyproject.toml`; configure ESLint, Prettier, Black, and shared TypeScript `tsconfig.base.json`
    - _Requirements: 10.1, 10.3_
  - [x] 1.2 Configure Firebase project: enable Authentication (email/password + Google OAuth), Firestore, Firebase Storage, and Firebase Hosting
    - Create Firestore security rules for `users`, `scans`, `leaderboard`, `recycling_centers`, `smart_bin_events`, `region_rules`, and `products` collections
    - _Requirements: 8.1, 8.6_
  - [x] 1.3 Define all shared TypeScript types and interfaces in `frontend/src/types/index.ts` and `gateway/src/types/index.ts`
    - Include `ClassificationResult`, `ScanDocument`, `UserDocument`, `ProductDocument`, `RecyclingCenterDocument`, `LeaderboardDocument`, `SmartBinEventDocument`, `RegionRulesDocument`, `ErrorResponse`, `MaterialType`, `WasteCategory`, `BinColor`, `BoundingBox`, `DecisionLog`
    - _Requirements: 1.2, 1.3, 1.4, 11.1_
  - [x] 1.4 Set up CI/CD pipeline with GitHub Actions: lint → test → build → deploy to Firebase Hosting + Cloud Run on merge to `main`
    - Include Lighthouse CI step targeting LCP < 3s and TBT < 200ms
    - _Requirements: 10.1_

- [x] 2. Node.js API Gateway foundation
  - [x] 2.1 Bootstrap Express app with middleware stack in order: `helmet()`, `cors()` (origin whitelist), `express-rate-limit` (60 req/min public, 200 req/min authenticated, 20 req/min for `/api/classify`), `morgan`, `jwtVerify`, `errorHandler`
    - _Requirements: 8.7, 10.6_
  - [x] 2.2 Implement `jwtVerify` middleware using Firebase Admin SDK `verifyIdToken`; attach decoded `{ uid, email, emailVerified }` to `req.user`
    - Handle `TOKEN_EXPIRED` (401), `ACCOUNT_LOCKED` (423) by checking `users/{userId}.accountLockedUntil` in Firestore
    - _Requirements: 8.3, 8.4, 8.7, 8.8_
  - [x] 2.3 Implement `errorHandler` middleware that normalizes all errors to `{ error, code, retryable, requestId }` schema
    - Map all known error scenarios from the design error table to correct HTTP status codes and `retryable` flags
    - _Requirements: 10.6_
  - [x] 2.4 Implement account lockout logic: after 3 failed login attempts set `accountLockedUntil = now + 15min` and `failedLoginAttempts` in Firestore; reset on successful login
    - Expose `POST /api/auth/verify` route
    - _Requirements: 8.4_
  - [x] 2.5 Implement `PATCH /api/users/:userId/profile` and `DELETE /api/users/:userId` routes with ownership check (`req.user.uid === userId`)
    - `DELETE` schedules a Cloud Function for hard deletion within 30 days
    - _Requirements: 8.5, 8.6_

- [ ] 3. Python FastAPI Classification Service — core
  - [-] 3.1 Bootstrap FastAPI app with Pydantic models for `ClassifyRequest`, `ClassifyResponse`, `BatchClassifyRequest`, `BatchClassifyResponse`; wire up Firebase Admin SDK for Firestore writes
    - _Requirements: 1.2_
  - [ ] 3.2 Implement `GeminiClient` wrapper around `google-generativeai` SDK: encode base64 image, build prompt with region rules context, call `gemini-1.5-flash`, parse structured JSON response into `ClassificationResult`
    - Validate MIME type and enforce 10 MB size limit before sending to Gemini
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [ ] 3.3 Implement `DecisionEngine.resolve(raw_category, confidence_score, region_rules)` → `ClassificationResult`
    - Apply region rule overrides when confidence < 60; populate `DecisionLog`; set `isLowConfidence` flag; always return exactly one `WasteCategory`
    - _Requirements: 1.4, 1.5, 1.6, 11.1, 11.2, 11.3, 11.4_
  - [ ]* 3.4 Write property test for Decision_Engine (Property 1)
    - **Property 1: Decision_Engine always produces exactly one Waste_Category**
    - Use Hypothesis: generate random `(raw_category, confidence_score 0–100, optional region_rules)` tuples; assert `result.waste_category in {'Reduce', 'Reuse', 'Recycle'}`
    - **Validates: Requirements 1.4, 11.1**
  - [ ]* 3.5 Write property test for Confidence_Score range and isLowConfidence flag (Property 2)
    - **Property 2: Confidence_Score is always in range [0, 100]**
    - Use Hypothesis: generate arbitrary classification inputs; assert `0 <= result.confidence_score <= 100` and `(result.confidence_score < 60) == result.is_low_confidence`
    - **Validates: Requirements 1.5, 1.6, 11.3**
  - [ ]* 3.6 Write property test for MaterialType enum validity (Property 3)
    - **Property 3: MaterialType is always a valid enum member**
    - Use Hypothesis: generate random image bytes (100–500 000 bytes) with mock Gemini; assert `result.material_type in VALID_MATERIAL_TYPES`
    - **Validates: Requirements 1.3**
  - [ ]* 3.7 Write property test for ClassificationResult required fields (Property 11)
    - **Property 11: Classification result always contains all required fields**
    - Use Hypothesis: generate valid `ClassifyRequest` inputs with mock Gemini; assert every `ClassificationResult` has non-null `itemName`, `materialType`, `wasteCategory`, `binColor`, `confidenceScore`, `len(reuseIdeas) >= 1`, `len(ecoTips) >= 1`
    - **Validates: Requirements 1.2, 9.1**
  - [ ] 3.8 Implement `MultiObjectHandler.detect_and_classify(image)`: detect bounding boxes (up to 10 objects), crop sub-images, dispatch parallel Gemini calls, return list of `ClassificationResult`
    - _Requirements: 1.7, 12.1, 12.2, 12.4_
  - [ ]* 3.9 Write property test for Multi_Object_Handler count bounds (Property 7)
    - **Property 7: Multi_Object_Handler result count is bounded and exact**
    - Use Hypothesis: generate `n_objects` in [1, 10] with mock image generator; assert `len(results) == n_objects` and `len(results) <= 10`
    - **Validates: Requirements 1.7, 12.2**
  - [ ] 3.10 Wire `POST /classify` endpoint: decode image → `MultiObjectHandler` → `DecisionEngine` → persist `ScanDocument` to Firestore → return `ClassifyResponse`
    - Wire `POST /classify/batch` for batch processing
    - _Requirements: 1.2, 12.4_

- [ ] 4. Checkpoint — backend core
  - Ensure all Python unit tests and property tests pass (`pytest --tb=short`). Verify `POST /classify` returns a valid `ClassifyResponse` with a Gemini mock. Ask the user if questions arise.

- [ ] 5. Gamification Service (Node.js)
  - [ ] 5.1 Implement points calculation function: `calculatePoints(materialType, streakCount)` → `{ basePoints, bonusPoints, streakBonus, totalPoints }` using the formula from the design
    - _Requirements: 5.1_
  - [ ]* 5.2 Write property test for points formula (Property 4)
    - **Property 4: Points awarded are always non-negative and follow the formula**
    - Use fast-check: generate arbitrary `(materialType, streakCount ≥ 0)` pairs; assert `totalPoints >= 10`, `bonusPoints >= 0`, `streakBonus >= 0`, and `totalPoints === basePoints + bonusPoints + streakBonus`
    - **Validates: Requirements 5.1**
  - [ ] 5.3 Implement `assignEcoLevel(ecoPoints)` → `'Beginner' | 'Eco Warrior' | 'Eco Hero'` using the threshold table
    - _Requirements: 5.2_
  - [ ]* 5.4 Write property test for Eco_Level assignment (Property 5)
    - **Property 5: Eco_Level assignment is consistent with point thresholds**
    - Use fast-check: generate arbitrary `ecoPoints >= 0`; assert level is `'Beginner'` if `< 200`, `'Eco Warrior'` if `200–999`, `'Eco Hero'` if `>= 1000`; assert no undefined result
    - **Validates: Requirements 5.2**
  - [ ] 5.5 Implement `StreakSystem.update({ streakCount, streakLastDate }, scanDate)` → `{ streakCount, streakLastDate }` following the state machine in the design
    - _Requirements: 5.9, 5.10, 5.11_
  - [ ]* 5.6 Write property test for streak state machine (Property 6)
    - **Property 6: Streak state machine is correct for all date transitions**
    - Use fast-check: generate arbitrary `(streakCount 0–365, streakLastDate ISO, scanDate ISO)` triples; assert same-day → unchanged, next-day → `+1`, gap > 1 day → reset to `1`; assert `streakCount >= 0` always
    - **Validates: Requirements 5.10, 5.11**
  - [ ] 5.7 Implement `POST /internal/gamification/award-points`: calculate points, update `users/{userId}` in Firestore (ecoPoints, ecoLevel, streakCount, streakLastDate, totalScans, totalCorrectDisposals, co2SavedKg), trigger badge evaluation
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 5.8 Implement Badge_System evaluation as a Firestore Cloud Function triggered on `users/{userId}` writes: check all six badge conditions and append newly earned badges to `badges[]`
    - Badges: First Scan, Plastic Saver, Recycling Champion, Eco Streak, E-Waste Warrior, Century Scanner
    - _Requirements: 5.3, 5.8_
  - [ ] 5.9 Implement `GET /internal/gamification/leaderboard?filter=city|college&value=...`: query `leaderboard` collection, return top 50 sorted by `ecoPoints` descending
    - Implement scheduled Cloud Function to recompute global ranks and reset `weeklyPoints` nightly
    - _Requirements: 5.4, 5.5_

- [ ] 6. Location Service and Product Database (Node.js)
  - [ ] 6.1 Implement `GET /internal/location/recycling-centers?lat=&lng=&material=&radius=`: geohash range query on `recycling_centers`, compute Haversine distance for each result, sort ascending, expand to 25 km if no results within 10 km
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 14.3_
  - [ ]* 6.2 Write property test for recycling center sort order (Property 9)
    - **Property 9: Recycling center results are sorted by distance ascending**
    - Use fast-check: generate arbitrary lists of `RecyclingCenterDocument` with random `GeoPoint` values and a random user location; assert `distance[i] <= distance[i+1]` for all consecutive pairs in the returned list
    - **Validates: Requirements 3.2**
  - [ ] 6.3 Implement `GET /internal/location/region-rules?lat=&lng=`: resolve city/PIN from coordinates, fetch `region_rules` document, return rules; cache response for 24 hours
    - _Requirements: 3.4, 14.1, 14.2_
  - [ ] 6.4 Implement `GET /api/products/:barcodeId`: validate barcode format (EAN-13, UPC-A, QR), query `products` collection, return `ProductDocument`; return `BARCODE_NOT_FOUND` 404 on miss
    - _Requirements: 2.2, 2.3, 13.1, 13.3_
  - [ ]* 6.5 Write property test for product material components sum (Property 8)
    - **Property 8: Product material components sum to 100%**
    - Use fast-check: generate arbitrary `ProductDocument` objects with random `materialComponents` arrays; assert `sum(percentages) === 100`, no individual percentage is negative or > 100
    - **Validates: Requirements 13.1, 13.5**

- [ ] 7. Smart Bin Service (Node.js)
  - [ ] 7.1 Implement `POST /api/smart-bin/command`: validate `SmartBinCommand` payload, publish MQTT message to `ecoscan/bins/{binId}/command`, subscribe to `ecoscan/bins/{binId}/ack` with 5-second timeout
    - On acknowledgement: return `SmartBinCommandResponse { commandId, status: 'acknowledged', compartment, openDurationSeconds: 10 }`
    - On timeout: return 408 with fallback `{ binColor, manualInstructions }`
    - Log event to `smart_bin_events` Firestore collection
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  - [ ]* 7.2 Write unit tests for Smart Bin Service
    - Test: successful acknowledgement flow, 5-second timeout → 408 fallback, Firestore event logging, invalid `binId` rejection
    - _Requirements: 6.1, 6.4, 6.5_

- [ ] 8. Checkpoint — all backend services
  - Ensure all gateway, gamification, location, and smart bin unit and property tests pass. Verify end-to-end scan flow with mocks: image upload → Gemini mock → Decision_Engine → Firestore write → points award. Ask the user if questions arise.

- [ ] 9. React frontend — foundation and auth
  - [ ] 9.1 Bootstrap Vite + React 18 app; configure React Router v6 with routes: `/`, `/scan`, `/result/:scanId`, `/dashboard`, `/leaderboard`; add `ErrorBoundary` wrapper on each route
    - _Requirements: 10.2, 10.3_
  - [ ] 9.2 Implement `AuthContext` with `useReducer`: states for `unauthenticated`, `authenticating`, `authenticated`, `locked`; expose `login`, `loginWithGoogle`, `logout`, `register`, `deleteAccount` actions
    - Use `firebase/auth` SDK with `browserLocalPersistence`; implement "Remember Me" via `trustedDevices` fingerprint stored in Firestore
    - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.9, 8.10_
  - [ ] 9.3 Build `LoginScreen` and `RegisterScreen` components: email/password form with validation, Google OAuth button (`signInWithPopup`), "Remember Me" checkbox, account-locked error display
    - _Requirements: 8.1, 8.2, 8.4_
  - [ ] 9.4 Implement `useApiCall` hook: wraps all fetch calls with JWT `Authorization: Bearer` header, dispatches errors to global `ErrorContext`, shows toast within 1 second of error receipt
    - _Requirements: 10.6_
  - [ ] 9.5 Build `Navbar` and `OfflineBanner` shared components; implement `LoadingSpinner`
    - `OfflineBanner` subscribes to `navigator.onLine` events and displays offline indicator
    - _Requirements: 7.2_

- [ ] 10. React frontend — Scanner and result screens
  - [ ] 10.1 Build `ScanScreen` with `CameraFeed` component: request `getUserMedia`, display live video feed within 2 seconds of permission grant, `CaptureButton` to snapshot frame, `UploadButton` for file input (JPEG/PNG)
    - _Requirements: 1.1, 1.8_
  - [ ] 10.2 Integrate ZXing-js barcode overlay (`BarcodeOverlay`): decode EAN-13/UPC-A/QR from video stream within 3 seconds; on miss after 10 seconds show guidance message and manual entry option
    - _Requirements: 2.1, 2.4_
  - [ ] 10.3 Implement `ScanContext` with `useReducer`: manage `activeImage`, `classificationResults`, `offlineQueue`, `scanMode`; encode captured image as base64 and `POST /api/classify`
    - _Requirements: 1.2, 7.3_
  - [ ] 10.4 Build `ResultScreen` with sub-components: `ClassificationCard`, `ConfidenceBar`, `BinColorIndicator` (color-coded), `ReuseIdeasList`, `EcoTipCard`, `ShareButton`, `SmartBinButton`, `RecyclingCenterMap`
    - Display result within 1 second of receiving API response; show low-confidence warning when `isLowConfidence === true`
    - _Requirements: 1.5, 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ] 10.5 Implement multi-object result display: scrollable list of `ClassificationCard` items when `results.length > 1`; tap to expand full disposal instructions, reuse ideas, and eco tips for each item
    - _Requirements: 12.3, 12.5_
  - [ ] 10.6 Implement `ShareButton`: use Web Share API (with canvas-rendered fallback image) to share result to WhatsApp, Instagram, Twitter/X
    - _Requirements: 9.5_
  - [ ]* 10.7 Write unit tests for ResultScreen components
    - Test: correct bin color rendering per `BinColor` value, low-confidence warning visibility, multi-object list rendering, share button invocation
    - _Requirements: 9.1, 1.6_

- [ ] 11. React frontend — Dashboard and Leaderboard
  - [ ] 11.1 Build `DashboardScreen`: fetch `GET /api/dashboard/:userId`; render `StatsOverview` (total scans, correct disposals, recycling rate, CO₂ saved — weekly and all-time), `LevelProgressBar`, `BadgeGrid`, `CouponList`
    - Update all metrics within 2 seconds of navigation; show empty state when no scan history
    - _Requirements: 4.1, 4.3, 4.5, 4.6_
  - [ ] 11.2 Implement `WeeklyBarChart` (daily scan counts, 7 days) and `MaterialPieChart` (material type distribution, current week) using a lightweight charting library (e.g., Recharts)
    - _Requirements: 4.2_
  - [ ] 11.3 Implement `GamificationContext` with `useReducer`: manage `ecoPoints`, `ecoLevel`, `badges`, `streakCount`; show level-up animation and congratulatory notification on new badge/level
    - _Requirements: 4.4, 5.3_
  - [ ] 11.4 Build `LeaderboardScreen`: fetch `GET /api/leaderboard?filter=&value=`; render `FilterBar` (city / college), `LeaderboardTable` (rank, username, Eco_Level badge, Eco_Points, city), `UserRankCard` for current user
    - _Requirements: 5.4, 5.5_
  - [ ] 11.5 Implement Eco Hero certificate generation: when `ecoLevel === 'Eco Hero'`, render a downloadable certificate canvas with user name, total scans, CO₂ saved, and date; expose download button
    - _Requirements: 5.6_
  - [ ]* 11.6 Write unit tests for Dashboard and Leaderboard components
    - Test: empty state rendering, level-up notification trigger, leaderboard filter switching, certificate canvas output
    - _Requirements: 4.4, 4.6, 5.4, 5.6_

- [ ] 12. Offline mode
  - [ ] 12.1 Configure Workbox in `vite.config.ts`: Cache First for app shell and static assets (30 days), Stale While Revalidate for `region-rules` (24 hours), Network First for `recycling-centers` (1 hour)
    - _Requirements: 7.1, 7.2, 7.4_
  - [ ] 12.2 Implement IndexedDB layer (`ecoscan-offline` v1) with object stores `cached_results` and `pending_syncs`; implement LRU eviction when `cached_results` exceeds 50 entries
    - _Requirements: 7.1, 7.5_
  - [ ]* 12.3 Write property test for offline cache size bound (Property 10)
    - **Property 10: Offline cache never exceeds 50 entries**
    - Use fast-check: generate arbitrary sequences of cache insertions (up to 200 operations); assert `cached_results.count <= 50` after every insertion; assert LRU entry is evicted on the 51st insert
    - **Validates: Requirements 7.1**
  - [ ] 12.4 Implement Service Worker intercept for `POST /api/classify`: check `cached_results` for matching `materialType`; return cached result with `isOffline: true` if found; write scan to `pending_syncs` if not found
    - _Requirements: 7.2, 7.5_
  - [ ] 12.5 Implement Background Sync: on reconnect, drain `pending_syncs` queue by POSTing each record to `POST /api/classify/sync`; clear synced records; update `Offline_Cache` with latest classification rules
    - _Requirements: 7.4_
  - [ ]* 12.6 Write unit tests for offline mode
    - Test: cache hit returns `isOffline: true`, cache miss returns structured error, pending sync queue drains on reconnect, barcode lookup disabled offline
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Checkpoint — frontend core complete
  - Ensure all React component unit tests pass (`vitest --run`). Verify scan → result → dashboard flow end-to-end with API mocks. Verify offline mode with DevTools network throttling. Ask the user if questions arise.

- [ ] 14. Interactive Canvas animation (HomeScreen)
  - [ ] 14.1 Build `ParticleCanvas` component: initialize 40–60 particles with waste-icon types (recycling symbol, leaf, bottle, can); animate with `requestAnimationFrame`; wrap particles at screen edges; resize canvas on `window.resize`
    - _Requirements: 10.7_
  - [ ] 14.2 Implement mouse repulsion: on `mousemove`, compute distance from each particle to cursor; apply repulsion force inversely proportional to distance for particles within 120px radius
    - _Requirements: 10.7_
  - [ ] 14.3 Enforce animation performance budget: measure frame time with `performance.now()`; assert ≤ 2ms per frame in unit tests; lazy-load `ParticleCanvas` via dynamic `import()` after first paint using `IntersectionObserver`
    - _Requirements: 10.7_
  - [ ] 14.4 Build `HomeScreen`: compose `ParticleCanvas` (background), `HeroSection`, `StreakBadge` (logged-in users, streak flame icon + count), `CTAButtons`
    - _Requirements: 5.12_
  - [ ]* 14.5 Write unit tests for ParticleCanvas
    - Test: particle count in [40, 60], repulsion direction is away from cursor, canvas resizes on window resize, frame budget assertion (≤ 2ms)
    - _Requirements: 10.7_

- [ ] 15. Accessibility and responsive design
  - [ ] 15.1 Add `aria-label`, `role`, and `alt` attributes to all non-text UI elements (icons, charts, bin color indicators, camera feed, canvas); verify with axe-core integrated into Vitest component tests
    - _Requirements: 10.4_
  - [ ] 15.2 Audit and fix color contrast: ensure all primary UI text meets 4.5:1 contrast ratio against background; update Tailwind/CSS tokens as needed
    - _Requirements: 10.5_
  - [ ] 15.3 Verify responsive layouts at all five breakpoints (320px, 425px, 768px, 1024px, 1440px): single-column mobile, two-column tablet result layout, three-column desktop dashboard
    - _Requirements: 10.2_
  - [ ]* 15.4 Write axe-core accessibility tests for all five screens
    - Run `axe` on rendered `HomeScreen`, `ScanScreen`, `ResultScreen`, `DashboardScreen`, `LeaderboardScreen`; assert zero critical violations
    - _Requirements: 10.4_

- [ ] 16. Integration wiring and end-to-end tests
  - [ ] 16.1 Wire barcode scan path end-to-end: `BarcodeOverlay` decode → `POST /api/classify/barcode` → `Product_Database` lookup → fallback to `GeminiClient` on 404 → `ResultScreen`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 16.2 Wire location path end-to-end: `ResultScreen` "Find Recycling Center" button → `GET /api/recycling-centers` → `RecyclingCenterMap` with navigation links; PIN code manual entry fallback
    - _Requirements: 3.1, 3.3, 3.5_
  - [ ] 16.3 Wire Smart Bin path end-to-end: `SmartBinButton` visible when bin in range → `POST /api/smart-bin/command` → acknowledgement display or 408 fallback message
    - _Requirements: 6.3, 6.4_
  - [ ] 16.4 Wire new-device login notification: Firestore Cloud Function triggers on `trustedDevices` write → sends email via Firebase Extensions (Trigger Email)
    - _Requirements: 8.9_
  - [ ]* 16.5 Write integration tests for end-to-end flows
    - Test: image upload → Gemini mock → Decision_Engine → Firestore write → points award; barcode lookup → Product_Database → result screen; Smart Bin command → MQTT mock → Firestore log; Google OAuth → Firebase token → gateway verification; offline scan → IndexedDB → reconnect → Firestore sync
    - _Requirements: 1.2, 2.2, 6.1, 8.1, 7.4_

- [ ] 17. Final checkpoint — full system
  - Ensure all unit, property, integration, and accessibility tests pass. Run Lighthouse CI and confirm LCP < 3s, TBT < 200ms. Verify all 11 correctness properties are covered by passing property-based tests. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 4, 8, 13, 17) ensure incremental validation at each major milestone
- All 11 correctness properties from the design are covered by property-based tests:
  - Property 1 → task 3.4 (Hypothesis, Python)
  - Property 2 → task 3.5 (Hypothesis, Python)
  - Property 3 → task 3.6 (Hypothesis, Python)
  - Property 4 → task 5.2 (fast-check, Node.js)
  - Property 5 → task 5.4 (fast-check, Node.js)
  - Property 6 → task 5.6 (fast-check, Node.js)
  - Property 7 → task 3.9 (Hypothesis, Python)
  - Property 8 → task 6.5 (fast-check, Node.js)
  - Property 9 → task 6.2 (fast-check, Node.js)
  - Property 10 → task 12.3 (fast-check, frontend)
  - Property 11 → task 3.7 (Hypothesis, Python)
- Unit tests use Vitest (frontend/gateway) and pytest (classifier)
- Integration tests use Vitest + supertest (gateway) and pytest + httpx (classifier)
