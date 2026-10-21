"""Pydantic v2 models for the EcoScan AI Classification Service."""

from typing import Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enum-like Literal types
# ---------------------------------------------------------------------------

MaterialType = Literal["plastic", "metal", "paper", "glass", "organic", "e-waste", "textile"]
WasteCategory = Literal["Reduce", "Reuse", "Recycle"]
BinColor = Literal["Blue", "Green", "Red", "Yellow", "Black"]

# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------


class Location(BaseModel):
    lat: float
    lng: float


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class DecisionLog(BaseModel):
    raw_gemini_category: str
    raw_confidence: float
    region_rule_applied: bool
    region_rule_id: str | None = None
    final_override: bool


class MaterialOverride(BaseModel):
    material_type: MaterialType
    waste_category: WasteCategory
    bin_color: BinColor
    notes: str


class RegionRules(BaseModel):
    rule_id: str
    city: str
    pin_codes: list[str]
    material_overrides: list[MaterialOverride] = Field(default_factory=list)
    guidelines_url: str


# ---------------------------------------------------------------------------
# Classification result
# ---------------------------------------------------------------------------


class ClassificationResult(BaseModel):
    object_index: int
    bounding_box: BoundingBox | None = None
    item_name: str
    material_type: MaterialType
    waste_category: WasteCategory
    bin_color: BinColor
    confidence_score: float = Field(ge=0, le=100)
    is_low_confidence: bool
    reuse_ideas: list[str] = Field(default_factory=list)
    eco_tips: list[str] = Field(default_factory=list)
    eco_alternatives: list[str] = Field(default_factory=list)
    disposal_instructions: str
    decision_log: DecisionLog


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class ClassifyRequest(BaseModel):
    image_b64: str
    location: Location | None = None
    user_id: str
    region_rules: RegionRules | None = None


class ClassifyResponse(BaseModel):
    results: list[ClassificationResult]
    scan_id: str


class BatchClassifyRequest(BaseModel):
    images: list[str]
    user_id: str
    location: Location | None = None


class BatchClassifyResponse(BaseModel):
    results: list[list[ClassificationResult]]
    scan_ids: list[str]
