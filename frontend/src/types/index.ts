// Shared TypeScript types and interfaces for EcoScan AI frontend
// Dates are represented as ISO strings or numbers (not Firestore Timestamps)

// ─── Primitive enums ────────────────────────────────────────────────────────

export type MaterialType =
  | 'plastic'
  | 'metal'
  | 'paper'
  | 'glass'
  | 'organic'
  | 'e-waste'
  | 'textile';

export type WasteCategory = 'Reduce' | 'Reuse' | 'Recycle';

export type BinColor = 'Blue' | 'Green' | 'Red' | 'Yellow' | 'Black';

// ─── Supporting types ────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DecisionLog {
  rawGeminiCategory: string;
  rawConfidence: number;
  regionRuleApplied: boolean;
  regionRuleId: string | null;
  finalOverride: boolean;
}

// ─── Classification ──────────────────────────────────────────────────────────

export interface ClassificationResult {
  objectIndex: number;
  boundingBox: BoundingBox | null;
  itemName: string;
  materialType: MaterialType;
  wasteCategory: WasteCategory;
  binColor: BinColor;
  confidenceScore: number;       // 0–100
  isLowConfidence: boolean;      // confidenceScore < 60
  reuseIdeas: string[];
  ecoTips: string[];
  ecoAlternatives: string[];     // for Reduce category
  disposalInstructions: string;
  decisionLog: DecisionLog;
}

// ─── Firestore document shapes (frontend — dates as ISO strings / numbers) ──

export interface BadgeRecord {
  badgeId: string;               // e.g. "plastic_saver"
  name: string;
  awardedAt: string;             // ISO date string
}

export interface ScanDocument {
  scanId: string;
  userId: string;
  timestamp: string;             // ISO date string
  imageUrl: string | null;
  results: ClassificationResult[];
  pointsAwarded: number;
  scanMode: 'camera' | 'upload' | 'barcode';
  location: { latitude: number; longitude: number } | null;
  isOffline: boolean;
  syncedAt: string | null;       // ISO date string
}

export interface UserDocument {
  uid: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  photoURL: string | null;
  city: string;
  college: string | null;
  ecoPoints: number;
  ecoLevel: 'Beginner' | 'Eco Warrior' | 'Eco Hero';
  badges: BadgeRecord[];
  streakCount: number;
  streakLastDate: string;        // ISO date "YYYY-MM-DD"
  totalScans: number;
  totalCorrectDisposals: number;
  co2SavedKg: number;
  createdAt: string;             // ISO date string
  updatedAt: string;             // ISO date string
  trustedDevices: string[];
  accountLockedUntil: string | null; // ISO date string
  failedLoginAttempts: number;
}

export interface MaterialComponent {
  materialType: MaterialType;
  percentage: number;            // 0–100, components sum to 100
}

export interface ProductDocument {
  barcodeId: string;
  productName: string;
  brand: string;
  materialComponents: MaterialComponent[];
  primaryWasteCategory: WasteCategory;
  primaryBinColor: BinColor;
  disposalInstructions: string;
  lastUpdated: string;           // ISO date string
  source: 'manufacturer' | 'community' | 'admin';
}

export interface RecyclingCenterDocument {
  centerId: string;
  name: string;
  address: string;
  location: { latitude: number; longitude: number };
  geohash: string;
  acceptedMaterials: MaterialType[];
  operatingHours: string;
  phone: string | null;
  website: string | null;
  city: string;
  pinCode: string;
}

export interface LeaderboardDocument {
  userId: string;
  displayName: string;
  ecoPoints: number;
  ecoLevel: string;
  city: string;
  college: string | null;
  rank: number;
  weeklyPoints: number;
}

export interface SmartBinEventDocument {
  eventId: string;
  binId: string;
  userId: string;
  scanId: string;
  materialType: MaterialType;
  wasteCategory: WasteCategory;
  compartment: string;
  commandStatus: 'sent' | 'acknowledged' | 'timeout' | 'error';
  timestamp: string;             // ISO date string
}

export interface MaterialOverride {
  materialType: MaterialType;
  wasteCategory: WasteCategory;
  binColor: BinColor;
  notes: string;
}

export interface RegionRulesDocument {
  ruleId: string;
  city: string;
  pinCodes: string[];
  materialOverrides: MaterialOverride[];
  guidelinesUrl: string;
  lastUpdated: string;           // ISO date string
}

// ─── API types ───────────────────────────────────────────────────────────────

export interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
  requestId: string;
}

export interface SmartBinCommand {
  binId: string;
  materialType: MaterialType;
  wasteCategory: WasteCategory;
  binColor: BinColor;
  userId: string;
  scanId: string;
}

export interface SmartBinCommandResponse {
  commandId: string;
  binId: string;
  compartment: string;
  status: 'acknowledged' | 'timeout' | 'error';
  openDurationSeconds?: number;
  timestamp: string;             // ISO date string
  fallback?: {
    binColor: BinColor;
    manualInstructions: string;
  };
}
