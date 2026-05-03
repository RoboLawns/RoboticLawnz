"""Machine-learning client wrappers (Replicate, SAM 2, grass classifier).

Importing the heavy modules is gated behind their respective `from_settings()`
constructors — touching this package alone has zero side effects.
"""

from app.ml.grass_classifier import GrassClassificationFailed, GrassClassifier
from app.ml.replicate import (
    ReplicateClient,
    ReplicateError,
    ReplicateNotConfigured,
    ReplicateTimeout,
)
from app.ml.segmentation import LawnSegmenter, SegmentationFailed

__all__ = [
    "GrassClassificationFailed",
    "GrassClassifier",
    "LawnSegmenter",
    "ReplicateClient",
    "ReplicateError",
    "ReplicateNotConfigured",
    "ReplicateTimeout",
    "SegmentationFailed",
]
