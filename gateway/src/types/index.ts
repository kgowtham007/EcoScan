// Shared TypeScript types and interfaces for EcoScan AI gateway
// Dates use Firestore Timestamp (firebase-admin) where appropriate

import type { Timestamp, GeoPoint } from 'firebase-admin/firestore';

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

// ─── Firestore document shapes (gateway — dates as Firestore Timestamps) ────

export interface BadgeRecord {
  badgeId: string;               // e.g. "plastic_saver"
  name: string;
  awardedAt: Timestamp;
}

export interface ScanDocument {
  scanId: string;
  userId: string;
  timestamp: Timestamp;
  imageUrl: string | null;
  results: ClassificationResult[];
  pointsAwarded: number;
  scanMode: 'camera' | 'upload' | 'barcode';
  location: GeoPoint | null;
  isOffline: boolean;
  syncedAt: Timestamp | null;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  trustedDevices: string[];
  accountLockedUntil: Timestamp | null;
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
  lastUpdated: Timestamp;
  source: 'manufacturer' | 'community' | 'admin';
}

export interface RecyclingCenterDocument {
  centerId: string;
  name: string;
  address: string;
  location: GeoPoint;
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
  timestamp: Timestamp;
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
  lastUpdated: Timestamp;
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
  timestamp: string;             // ISO date string in API response
  fallback?: {
    binColor: BinColor;
    manualInstructions: string;
  };
}
