# Requirements Document

## Introduction

EcoScan AI is a smart waste segregation web application that uses AI-powered image recognition to classify waste items into Reduce, Reuse, or Recycle categories. The application provides real-time disposal instructions, creative reuse ideas, eco-friendly alternatives, gamification incentives, and location-based recycling guidance. It targets individual users (B2C) and waste management organizations (B2B), with a focus on the Indian market aligned with the Swachh Bharat mission.

The system integrates a camera-based scanner, barcode reader, personal impact dashboard, leaderboard, and a conceptual IoT smart bin communication layer — all wrapped in a green, minimal, modern UI.

---

## Glossary

- **EcoScan_AI**: The overall web application system described in this document.
- **Scanner**: The component responsible for capturing images via device camera or file upload and sending them to the AI model for classification.
- **AI_Classifier**: The backend service that uses Google Gemini Vision API to analyze images and classify waste items.
- **Barcode_Reader**: The component that decodes product barcodes and retrieves disposal guidance from the product database.
- **Waste_Category**: One of three top-level classifications: Reduce, Reuse, or Recycle.
- **Material_Type**: The physical material of a waste item (e.g., plastic, metal, paper, glass, organic, e-waste, textile).
- **Confidence_Score**: A percentage value (0–100%) representing the AI model's certainty in its classification.
- **Bin_Color**: The color-coded bin designation for a classified item (e.g., Blue for recyclables, Green for organic, Red for hazardous).
- **Reuse_Idea**: A creative suggestion for repurposing a waste item before disposal.
- **Eco_Tip**: A short actionable tip about reducing environmental impact related to the scanned item.
- **Recycling_Center**: A physical location that accepts specific waste materials for processing.
- **User_Profile**: The authenticated user's account containing scan history, points, level, and badges.
- **Eco_Points**: The gamification currency awarded to users for correct disposal actions.
- **Eco_Level**: A user rank determined by accumulated Eco_Points (Beginner → Eco Warrior → Eco Hero).
- **Leaderboard**: A ranked list of users by Eco_Points, filterable by college or city.
- **Smart_Bin**: A conceptual IoT-connected physical bin that receives signals from EcoScan_AI to open the correct compartment.
- **Dashboard**: The personal analytics screen showing weekly waste stats, CO₂ saved, and recycling rate.
- **Region_Rules**: Locale-specific waste disposal regulations (defaulting to India / Swachh Bharat guidelines).
- **Offline_Cache**: Locally stored classification results and rules available when the device has no internet connection.
- **Decision_Engine**: A backend component that combines AI_Classifier output, Confidence_Score, and Region_Rules to produce the final Waste_Category, Bin_Color, and disposal instructions. Prevents wrong decisions when classification is ambiguous or mixed.
- **Multi_Object_Handler**: A component that detects multiple waste objects in a single image, separates them, and classifies each independently.
- **Product_Database**: A backend database storing product name, material composition, and disposal instructions, linked to the Barcode_Reader.
- **Location_Service**: A backend service that detects the user's location and fetches nearby Recycling_Centers and applicable Region_Rules.
- **Badge_System**: A component of the gamification system that awards named badges (e.g., "Plastic Saver", "Recycling Champion") based on user behavior milestones.
- **Streak_System**: A gamification component that tracks consecutive daily usage and awards bonus Eco_Points for maintaining streaks.
- **Auth_System**: The authentication and session management component supporting email/password and Google OAuth 2.0 login with secure session handling.

---

## Requirements

### Requirement 1: Real-Time Waste Image Classification

**User Story:** As a user, I want to point my camera at a waste item and instantly receive its waste category, material type, and disposal instructions, so that I can dispose of it correctly without guessing.

#### Acceptance Criteria

1. WHEN the user activates the Scanner, THE Scanner SHALL request camera permission from the browser and display a live video feed within 2 seconds of permission being granted.
2. WHEN the user captures an image or uploads a photo, THE AI_Classifier SHALL return a classification result containing Waste_Category, Material_Type, Confidence_Score, Bin_Color, at least one Reuse_Idea, and at least one Eco_Tip within 5 seconds.
3. THE AI_Classifier SHALL classify waste items into one of the following Material_Types: plastic, metal, paper, glass, organic, e-waste, or textile.
4. THE AI_Classifier SHALL assign each classified item to exactly one Waste_Category: Reduce, Reuse, or Recycle.
5. THE Scanner SHALL display the Confidence_Score as a percentage alongside the Material_Type label on the result screen.
6. WHEN the Confidence_Score is below 60%, THE AI_Classifier SHALL display a low-confidence warning and prompt the user to retake the image or confirm the result manually.
7. WHEN the captured image contains multiple distinct waste items, THE AI_Classifier SHALL identify and classify each item separately and display all results on the result screen.
8. IF the AI_Classifier cannot identify any waste item in the image, THEN THE AI_Classifier SHALL display a descriptive error message and prompt the user to retake the image.

---

### Requirement 2: Barcode-Based Disposal Guidance

**User Story:** As a user, I want to scan a product barcode to get accurate disposal guidance for that specific product, so that I can recycle or dispose of branded items correctly.

#### Acceptance Criteria

1. WHEN the user activates the Barcode_Reader, THE Barcode_Reader SHALL decode a valid product barcode (EAN-13, UPC-A, QR Code) from the camera feed within 3 seconds of the barcode entering the camera frame.
2. WHEN a barcode is successfully decoded, THE Barcode_Reader SHALL query the product database and return the product name, Material_Type, Waste_Category, Bin_Color, and disposal instructions.
3. IF the decoded barcode does not match any product in the database, THEN THE Barcode_Reader SHALL fall back to AI_Classifier image analysis and notify the user that barcode lookup was unavailable.
4. IF the device camera cannot read the barcode after 10 seconds, THEN THE Barcode_Reader SHALL display a guidance message instructing the user to improve lighting or distance and offer a manual entry option.

---

### Requirement 3: Location-Based Recycling Center Discovery

**User Story:** As a user, I want to find the nearest recycling centers that accept my specific waste material, so that I can drop off items I cannot dispose of at home.

#### Acceptance Criteria

1. WHEN the user requests nearby recycling centers from the result screen, THE EcoScan_AI SHALL request the user's geolocation from the browser.
2. WHEN geolocation permission is granted, THE EcoScan_AI SHALL display a list of recycling centers within a 10 km radius that accept the classified Material_Type, sorted by distance in ascending order.
3. THE EcoScan_AI SHALL display each recycling center entry with: name, address, accepted material types, distance from user, and a navigation link.
4. WHILE the Region_Rules for the user's detected region are available, THE EcoScan_AI SHALL display region-specific disposal instructions aligned with Swachh Bharat guidelines alongside the recycling center list.
5. IF geolocation permission is denied, THEN THE EcoScan_AI SHALL prompt the user to enter a PIN code or city name manually to retrieve nearby recycling centers.
6. IF no recycling centers are found within 10 km for the classified Material_Type, THEN THE EcoScan_AI SHALL expand the search radius to 25 km and notify the user of the expanded search.

---

### Requirement 4: Personal Impact Dashboard

**User Story:** As a user, I want to view my weekly waste statistics and environmental impact metrics, so that I can track my progress and stay motivated to recycle correctly.

#### Acceptance Criteria

1. THE Dashboard SHALL display the user's total scans, total items correctly disposed, recycling rate percentage, and estimated CO₂ saved (in kg) for the current week and all-time totals.
2. WHEN the user navigates to the Dashboard, THE Dashboard SHALL render a bar chart of daily scan counts for the past 7 days and a pie chart of Material_Type distribution for the current week.
3. THE Dashboard SHALL update all metrics within 2 seconds of the user navigating to the Dashboard screen.
4. WHEN the user earns a new badge or reaches a new Eco_Level, THE Dashboard SHALL display a congratulatory notification on the next Dashboard visit.
5. THE Dashboard SHALL display the user's current Eco_Points, Eco_Level, and a progress bar showing points required to reach the next Eco_Level.
6. IF the user has no scan history, THEN THE Dashboard SHALL display an empty state with a prompt to perform the first scan.

---

### Requirement 5: Gamification and Rewards System

**User Story:** As a user, I want to earn points, badges, and rewards for correctly disposing of waste, so that I stay engaged and motivated to maintain eco-friendly habits.

#### Acceptance Criteria

1. WHEN the user confirms a correct disposal action after a scan, THE EcoScan_AI SHALL award Eco_Points to the User_Profile according to the item's Material_Type complexity (base: 10 points per scan, bonus: up to 20 additional points for e-waste or hazardous materials).
2. THE EcoScan_AI SHALL define the following Eco_Level thresholds: Beginner (0–199 points), Eco Warrior (200–999 points), Eco Hero (1000+ points).
3. WHEN the user's Eco_Points cross an Eco_Level threshold, THE EcoScan_AI SHALL display a level-up animation and award a corresponding badge to the User_Profile.
4. THE EcoScan_AI SHALL maintain a Leaderboard displaying the top 50 users ranked by Eco_Points, filterable by college or city.
5. WHEN the user views the Leaderboard, THE Leaderboard SHALL display each entry with: rank, username, Eco_Level badge, Eco_Points, and city.
6. WHEN a user reaches Eco Hero level, THE EcoScan_AI SHALL generate a downloadable certificate of achievement containing the user's name, total scans, CO₂ saved, and date of achievement.
7. WHERE coupon rewards are configured by an administrator, THE EcoScan_AI SHALL display available reward coupons redeemable at configured Eco_Points thresholds on the Dashboard.
8. THE Badge_System SHALL award named badges based on behavioral milestones, including at minimum: "Plastic Saver" (scan and correctly dispose 10 plastic items), "Recycling Champion" (achieve 90%+ recycling rate over 30 days), "Eco Streak" (maintain a 7-day usage streak), and "E-Waste Warrior" (correctly dispose 5 e-waste items).
9. THE Streak_System SHALL track the user's consecutive daily scan activity and display the current streak count on the Dashboard and User_Profile.
10. WHEN the user completes a scan on a given day, THE Streak_System SHALL increment the daily streak counter and award 5 bonus Eco_Points per streak day beyond day 3.
11. WHEN the user misses a day, THE Streak_System SHALL reset the streak counter to zero and display a motivational message prompting the user to start a new streak.
12. THE EcoScan_AI SHALL display a streak flame icon with the current streak count on the home screen for logged-in users.

---

### Requirement 6: Conceptual Smart Bin IoT Integration

**User Story:** As a facility manager, I want EcoScan AI to communicate with smart bins so that the correct bin compartment opens automatically when a user scans a waste item nearby, reducing user error.

#### Acceptance Criteria

1. THE EcoScan_AI SHALL expose a REST API endpoint that accepts a classified waste item payload (Material_Type, Waste_Category, Bin_Color) and a Smart_Bin device identifier, and returns an open-compartment command.
2. WHEN a Smart_Bin receives an open-compartment command, THE Smart_Bin SHALL open the designated compartment within 3 seconds and close it automatically after 10 seconds.
3. THE EcoScan_AI SHALL display a "Send to Smart Bin" button on the result screen when a registered Smart_Bin is detected within Bluetooth or Wi-Fi range of the user's device.
4. IF the Smart_Bin does not acknowledge the open-compartment command within 5 seconds, THEN THE EcoScan_AI SHALL display a fallback message showing the correct Bin_Color and manual disposal instructions.
5. THE EcoScan_AI SHALL log all Smart_Bin command events with timestamp, device ID, Material_Type, and command status for facility manager review.

---

### Requirement 7: Offline Mode

**User Story:** As a user in a low-connectivity area, I want EcoScan AI to provide basic classification guidance even without internet access, so that I can still dispose of waste correctly.

#### Acceptance Criteria

1. THE EcoScan_AI SHALL cache the 50 most recently classified item results in the Offline_Cache on the user's device after each successful online classification.
2. WHILE the device has no internet connection, THE EcoScan_AI SHALL display an offline mode indicator and use the Offline_Cache to provide classification results for previously seen item types.
3. WHILE the device has no internet connection, THE EcoScan_AI SHALL disable the Barcode_Reader's database lookup and the recycling center discovery features, and display a message explaining the limitation.
4. WHEN the device regains internet connectivity, THE EcoScan_AI SHALL automatically sync any offline scan records to the User_Profile and update the Offline_Cache with the latest classification rules.
5. IF the user scans an item type not present in the Offline_Cache while offline, THEN THE EcoScan_AI SHALL display a message indicating the item cannot be classified offline and suggest the user retry when connected.

---

### Requirement 8: User Authentication, Auth_System, and Profile Management

**User Story:** As a user, I want to create an account and log in so that my scan history, points, and achievements are saved and accessible across devices.

#### Acceptance Criteria

1. THE EcoScan_AI SHALL support user registration via email/password and Google OAuth 2.0.
2. WHEN a user registers with an email address, THE EcoScan_AI SHALL send a verification email and require email verification before granting access to the Dashboard and Leaderboard.
3. WHEN a registered user logs in with valid credentials, THE EcoScan_AI SHALL authenticate the user and load the User_Profile within 3 seconds.
4. IF a user submits incorrect login credentials three consecutive times, THEN THE EcoScan_AI SHALL lock the account for 15 minutes and send an account security notification to the registered email.
5. THE EcoScan_AI SHALL allow users to update their display name, city, college affiliation, and profile photo from the User_Profile settings screen.
6. WHEN a user deletes their account, THE EcoScan_AI SHALL permanently remove all User_Profile data, scan history, and Eco_Points within 30 days in compliance with data privacy regulations.
7. THE Auth_System SHALL maintain secure user sessions using JWT tokens with a 7-day expiry, refreshing automatically on active use.
8. THE Auth_System SHALL invalidate all active sessions when the user changes their password.
9. WHEN a user logs in from a new device, THE Auth_System SHALL send a login notification email to the registered address.
10. THE Auth_System SHALL support "Remember Me" functionality that extends session duration to 30 days on trusted devices.

---

### Requirement 9: Result Screen and Eco Guidance Display

**User Story:** As a user, I want the scan result screen to clearly show me what to do with my waste item, including creative reuse ideas and eco-friendly alternatives, so that I make the most sustainable choice.

#### Acceptance Criteria

1. THE EcoScan_AI SHALL display the result screen within 1 second of receiving the AI_Classifier response, showing: item name, Material_Type, Waste_Category, Bin_Color with a color-coded visual indicator, Confidence_Score, at least one Reuse_Idea, at least one Eco_Tip, and a "Find Recycling Center" button.
2. WHEN the Waste_Category is "Reduce", THE EcoScan_AI SHALL display at least one eco-friendly product alternative to the scanned item.
3. WHEN the Waste_Category is "Reuse", THE EcoScan_AI SHALL display at least two creative Reuse_Ideas with brief step-by-step instructions.
4. WHEN the Waste_Category is "Recycle", THE EcoScan_AI SHALL display the correct Bin_Color, accepted preparation steps (e.g., rinse, flatten), and the nearest Recycling_Center if location permission is available.
5. THE EcoScan_AI SHALL allow the user to share the result screen as an image to social media platforms (WhatsApp, Instagram, Twitter/X) directly from the result screen.
6. THE EcoScan_AI SHALL display a "Scan Another Item" button on the result screen that returns the user to the Scanner without requiring navigation through the home screen.

---

### Requirement 10: Application Performance and Accessibility

**User Story:** As a user on a mid-range mobile device with a slow connection, I want EcoScan AI to load quickly and remain usable, so that I can scan waste items without frustration.

#### Acceptance Criteria

1. THE EcoScan_AI SHALL achieve an initial page load time of under 3 seconds on a 4G connection for the home screen.
2. THE EcoScan_AI SHALL be fully functional on screen widths from 320px to 1440px (responsive design).
3. THE EcoScan_AI SHALL support the latest two major versions of Chrome, Firefox, Safari, and Edge browsers.
4. THE EcoScan_AI SHALL provide text alternatives for all non-text UI elements (icons, images, charts) to support screen reader accessibility.
5. THE EcoScan_AI SHALL display all primary UI text at a minimum contrast ratio of 4.5:1 against the background color.
6. WHEN the AI_Classifier or any backend service returns an error, THE EcoScan_AI SHALL display a user-friendly error message with a retry option within 1 second of the error being received.
7. THE EcoScan_AI home screen SHALL feature an interactive background animation where waste-themed particles (e.g., floating leaves, recycling symbols, waste item icons) respond to mouse/pointer movement, creating a parallax or repulsion effect, without impacting page load performance (animation must be implemented using CSS/Canvas and must not increase initial load time by more than 500ms).

---

### Requirement 11: Decision Engine for Mixed/Ambiguous Classification

**User Story:** As a user, I want the app to make a reliable final disposal decision even when the AI detects mixed materials or has low confidence, so that I never get wrong instructions.

#### Acceptance Criteria

1. WHEN the AI_Classifier returns a result, THE Decision_Engine SHALL combine the AI_Classifier output, Confidence_Score, and applicable Region_Rules to produce a single final Waste_Category, Bin_Color, and set of disposal instructions.
2. WHEN the scanned item contains mixed materials (e.g., a plastic bottle with a metal cap), THE Decision_Engine SHALL classify each material component separately and present a combined disposal instruction covering all components.
3. WHEN the Confidence_Score is below 60%, THE Decision_Engine SHALL apply Region_Rules as a tiebreaker and flag the result as "low confidence" on the result screen.
4. THE Decision_Engine SHALL log all classification decisions with input parameters and final output for audit and model improvement purposes.
5. IF the Decision_Engine cannot produce a confident final classification after applying all rules, THEN THE EcoScan_AI SHALL present the top 2 possible classifications to the user and ask them to confirm.

---

### Requirement 12: Multi-Object Detection and Classification

**User Story:** As a user, I want to scan multiple waste items at once and get individual classifications for each, so that I can sort a pile of waste quickly.

#### Acceptance Criteria

1. WHEN the captured image contains more than one distinct waste item, THE Multi_Object_Handler SHALL detect and isolate each object using bounding boxes and classify each independently.
2. THE Multi_Object_Handler SHALL support detection of up to 10 distinct objects in a single image.
3. WHEN multiple objects are detected, THE EcoScan_AI SHALL display a scrollable result list showing each object's Material_Type, Waste_Category, Bin_Color, and Confidence_Score.
4. THE Multi_Object_Handler SHALL complete multi-object classification within 8 seconds for up to 10 objects.
5. WHEN the user taps on an individual object result, THE EcoScan_AI SHALL expand that result to show full disposal instructions, Reuse_Ideas, and Eco_Tips for that specific item.

---

### Requirement 13: Product Database

**User Story:** As a developer/admin, I want a structured product database linked to the barcode scanner so that barcode lookups return accurate, product-specific disposal data.

#### Acceptance Criteria

1. THE Product_Database SHALL store for each product: unique barcode ID, product name, brand, material composition (list of Material_Types with percentages), primary Waste_Category, Bin_Color, and step-by-step disposal instructions.
2. THE Product_Database SHALL support a minimum of 10,000 product entries at launch, with an admin interface for adding and updating entries.
3. WHEN the Barcode_Reader decodes a barcode, THE Barcode_Reader SHALL query the Product_Database using the barcode ID and return the matching product record within 2 seconds.
4. THE Product_Database SHALL be updated at minimum weekly with new product entries sourced from manufacturer data and community contributions.
5. WHEN a product has multiple material components, THE Product_Database SHALL store each component separately so the Decision_Engine can classify each material independently.

---

### Requirement 14: Location Service

**User Story:** As a user, I want the app to automatically detect my location and fetch relevant recycling centers and local waste rules, so that I get guidance specific to my area.

#### Acceptance Criteria

1. THE Location_Service SHALL detect the user's current location using browser Geolocation API and resolve it to a city and PIN code within 3 seconds.
2. WHEN the user's location is resolved, THE Location_Service SHALL fetch the applicable Region_Rules for that location from the backend and cache them locally for 24 hours.
3. THE Location_Service SHALL query a recycling center database filtered by the user's resolved location and the classified Material_Type, returning results sorted by distance.
4. WHEN the user's location changes by more than 5 km from the cached location, THE Location_Service SHALL automatically refresh the Region_Rules and recycling center data.
5. THE Location_Service SHALL support manual location override via PIN code or city name input when automatic detection is unavailable or denied.
