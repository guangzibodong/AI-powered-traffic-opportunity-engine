from dataclasses import dataclass


@dataclass(frozen=True)
class FeatureFlags:
    ai_visibility: bool = False
    shopify: bool = False
    autopilot: bool = False
    ga4: bool = False
    merchant_center: bool = False


DEFAULT_FEATURE_FLAGS = FeatureFlags()

