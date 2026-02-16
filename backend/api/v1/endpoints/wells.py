"""
Wells API Endpoints
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.models import Well, User
from backend.schemas.schemas import WellCreate, WellUpdate, WellResponse

router = APIRouter()


@router.post("/", response_model=WellResponse, status_code=status.HTTP_201_CREATED)
async def create_well(
    well_data: WellCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new well"""
    well = Well(
        **well_data.model_dump(),
        owner_id=current_user.id
    )
    db.add(well)
    await db.commit()
    await db.refresh(well)
    return well


@router.get("/", response_model=List[WellResponse])
async def list_wells(
    skip: int = 0,
    limit: int = 100,
    field: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all wells"""
    query = select(Well)
    
    if field:
        query = query.where(Well.field == field)
    if status:
        query = query.where(Well.status == status)
    
    query = query.offset(skip).limit(limit).order_by(Well.name)
    result = await db.execute(query)
    wells = result.scalars().all()
    return wells


@router.get("/{well_id}", response_model=WellResponse)
async def get_well(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific well"""
    result = await db.execute(select(Well).where(Well.id == well_id))
    well = result.scalar_one_or_none()
    
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    
    return well


@router.patch("/{well_id}", response_model=WellResponse)
async def update_well(
    well_id: int,
    well_data: WellUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a well"""
    result = await db.execute(select(Well).where(Well.id == well_id))
    well = result.scalar_one_or_none()
    
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    
    for key, value in well_data.model_dump(exclude_unset=True).items():
        setattr(well, key, value)
    
    await db.commit()
    await db.refresh(well)
    return well


@router.delete("/{well_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_well(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a well"""
    result = await db.execute(select(Well).where(Well.id == well_id))
    well = result.scalar_one_or_none()
    
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    
    await db.delete(well)
    await db.commit()
    return None
