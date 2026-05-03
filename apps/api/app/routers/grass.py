"""Grass species knowledge API — serves care guides and species data."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.grass_species import get_all_species, get_species

router = APIRouter(prefix="/grass", tags=["grass"])


@router.get("", summary="List all grass species with care information.")
async def list_species():
    return get_all_species()


@router.get("/{slug}", summary="Get detailed care guide for a single grass species.")
async def species_detail(slug: str):
    info = get_species(slug)
    if info is None:
        raise HTTPException(status_code=404, detail=f"Unknown grass species: {slug}")
    return info
