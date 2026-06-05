from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_roles
from app.models import OpenSpaceManager, User
from app.schemas import DashboardAnalyticsResponse, DashboardHomeStatsResponse
from app.services.dashboard_stats_service import (
    build_analytics_stats,
    build_home_stats,
    get_open_space,
    resolve_stats_range,
)

router = APIRouter(prefix="/api/dashboard/open-spaces", tags=["dashboard-stats"])


def _ensure_manager_access(db: Session, open_space_id: int, current_user: User) -> None:
    if current_user.role.name == "SUPER_ADMIN":
        return

    manager_assignment = db.query(OpenSpaceManager).filter(
        OpenSpaceManager.open_space_id == open_space_id,
        OpenSpaceManager.user_id == current_user.id,
        OpenSpaceManager.is_active == True,
    ).first()

    if not manager_assignment:
        raise HTTPException(status_code=403, detail="You can view this open space only if you are assigned to it")


@router.get("/{open_space_id}/stats/summary", response_model=DashboardHomeStatsResponse)
def get_dashboard_home_stats(
    open_space_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"])),
):
    try:
        open_space = get_open_space(db, open_space_id)
        if not open_space:
            raise HTTPException(status_code=404, detail="Open space not found")

        _ensure_manager_access(db, open_space_id, current_user)
        return build_home_stats(db, open_space_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{open_space_id}/stats", response_model=DashboardAnalyticsResponse)
def get_dashboard_stats(
    open_space_id: int,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    group_by: str | None = Query(default="day"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["SUPER_ADMIN", "MANAGER"])),
):
    try:
        open_space = get_open_space(db, open_space_id)
        if not open_space:
            raise HTTPException(status_code=404, detail="Open space not found")

        _ensure_manager_access(db, open_space_id, current_user)
        stats_range = resolve_stats_range(date_from, date_to, group_by)
        return build_analytics_stats(db, open_space_id, stats_range)
    except ValueError as error:
        detail = str(error)
        status_code = 404 if detail == "Open space not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from error