"""Shared Pydantic types — GeoJSON, pagination, etc."""

from __future__ import annotations

from typing import Annotated, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIModel(BaseModel):
    """All response/payload schemas inherit from this."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="ignore",
    )


class PolygonGeoJSON(BaseModel):
    """A GeoJSON Polygon (single outer ring, optional inner rings).

    Coordinates are `[lng, lat]` per the GeoJSON spec. We keep the wrapper as a
    plain Pydantic model rather than a `RootModel` so OpenAPI shows the shape
    clearly to the frontend.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[Annotated[tuple[float, float], Field(min_length=2, max_length=2)]]]


class PageMeta(APIModel):
    total: int
    limit: int
    offset: int


class Page(APIModel, Generic[T]):
    items: list[T]
    meta: PageMeta
