"""Grass species classifier using a Vision Language Model on Replicate.

Takes a close-up photo of grass blades, sends it to a VLM (default:
moondream2), and returns the top species guess with a confidence score.

The default prompt constrains the model to 11 common U.S. lawn species so
the output is always one of the known categories.
"""

from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass

from app.core.config import settings
from app.core.logging import get_logger
from app.ml.replicate import ReplicateClient, ReplicateError, ReplicateNotConfigured
from app.schemas.assessment import GrassGuess

logger = get_logger(__name__)

# Moondream is cheap ($0.012/1M tokens), small (1.86B params), and works
# well for single-image classification tasks.
DEFAULT_GRASS_MODEL = "vikhyatk/moondream2:72aa7c6e83e4b3e4e6db6f58e50e2fc9c6505c0b8f63e4562d758fa3d09042ff"

KNOWN_SPECIES = [
    "Bermuda",
    "Kentucky Bluegrass",
    "Tall Fescue",
    "Fine Fescue",
    "Perennial Ryegrass",
    "St. Augustine",
    "Zoysia",
    "Centipede",
    "Bahia",
    "Buffalo",
]

CLASSIFIER_PROMPT = (
    "You are a turfgrass expert. Examine this close-up photo of grass blades. "
    "Identify the most likely species from this list:\n"
    + "\n".join(f"- {s}" for s in KNOWN_SPECIES)
    + "\n\nReply with ONLY a valid JSON object and nothing else. "
    'The JSON must have this exact shape: {"species":"<name>","confidence":0.85}. '
    "Use one of the listed species names exactly as written. "
    "Confidence must be a number between 0 and 1. "
    'If you cannot determine the species, use {"species":"Unknown","confidence":0.0}.'
)


class GrassClassificationFailed(RuntimeError):
    """The VLM returned output that could not be parsed into a species guess."""


@dataclass(slots=True)
class GrassClassifier:
    """Identifies grass species from a photo using a Vision Language Model."""

    _replicate: ReplicateClient
    _model_version: str

    @classmethod
    def from_settings(cls) -> GrassClassifier:
        client = ReplicateClient.from_settings()
        version = settings.grass_classifier_model_version or DEFAULT_GRASS_MODEL
        return cls(client, version)

    async def classify(self, image_bytes: bytes) -> list[GrassGuess]:
        """Send a grass photo to the VLM and return species guesses.

        Returns a single-element list with the top guess.  The router can
        expand this to a top-N list later if needed.
        """
        data_uri = _encode_data_uri(image_bytes)

        logger.info("grass_classifier: sending prediction to %s", self._model_version)
        output = await self._replicate.run(
            self._model_version,
            {
                "image": data_uri,
                "prompt": CLASSIFIER_PROMPT,
            },
            max_wait_secs=30.0,
        )

        # Moondream returns a string; other VLMs might return a dict or list.
        text = _coerce_to_string(output)
        logger.info("grass_classifier: raw output=%s", text[:200])

        guesses = _parse_output(text)
        if not guesses:
            raise GrassClassificationFailed(f"could not parse VLM output: {text[:200]!r}")
        return guesses


def _encode_data_uri(image_bytes: bytes, mime: str = "image/jpeg") -> str:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _coerce_to_string(output: object) -> str:
    """Replicate VLM models may return a plain string or a list of strings."""
    if isinstance(output, str):
        return output
    if isinstance(output, list) and len(output) > 0 and isinstance(output[0], str):
        return output[0]
    return str(output)


_JSON_RE = re.compile(r"\{[^{}]*\}")


def _parse_output(text: str) -> list[GrassGuess]:
    """Parse VLM output into GrassGuess objects.

    Tries JSON first, then falls back to a substring search against the
    known species list.
    """
    # --- try JSON ---
    for match in _JSON_RE.finditer(text):
        try:
            obj = json.loads(match.group())
            species = str(obj.get("species", "")).strip()
            confidence = float(obj.get("confidence", 0.5))
        except (json.JSONDecodeError, ValueError, TypeError):
            continue

        # Normalise the species name against our canonical list.
        species = _match_species(species)
        if species:
            return [GrassGuess(species=species, confidence=max(0.0, min(1.0, confidence)))]

    # --- fallback: mention search ---
    text_lower = text.lower()
    for name in KNOWN_SPECIES:
        if name.lower() in text_lower:
            return [GrassGuess(species=name, confidence=0.5)]

    return []


def _match_species(raw: str) -> str | None:
    """Canonicalize a species name, allowing common abbreviations."""
    raw = raw.strip()
    # Direct match (case-insensitive)
    for s in KNOWN_SPECIES:
        if s.lower() == raw.lower():
            return s
    # Fuzzy: "KBG" -> Kentucky Bluegrass
    aliases: dict[str, str] = {
        "kbg": "Kentucky Bluegrass",
        "kentucky blue": "Kentucky Bluegrass",
        "bermudagrass": "Bermuda",
        "st augustine": "St. Augustine",
        "zoysiagrass": "Zoysia",
        "bahiagrass": "Bahia",
        "buffalograss": "Buffalo",
        "centipedegrass": "Centipede",
        "ryegrass": "Perennial Ryegrass",
        "fescue": "Tall Fescue",
        "tall fescue": "Tall Fescue",
        "fine fescue": "Fine Fescue",
    }
    return aliases.get(raw.lower())


__all__ = [
    "GrassClassifier",
    "GrassClassificationFailed",
    "CLASSIFIER_PROMPT",
    "KNOWN_SPECIES",
]
