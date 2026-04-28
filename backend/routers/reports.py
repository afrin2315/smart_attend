import io
from datetime import datetime, timedelta
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_roles
from database import get_db
from models import Attendance, CourseOrDepartment, Organization, Role, Session as SessionModel, User
from routers.sessions import build_session_summary
from schemas import ReportRow

router = APIRouter(prefix="/reports", tags=["reports"])


def _parse_date_range(start_date, end_date):
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) + timedelta(days=1) if end_date else None
    return start_dt, end_dt


def _apply_session_filters(query, course_or_dept_id=None, session_id=None, start_date=None, end_date=None):
    if session_id:
        query = query.filter(SessionModel.id == session_id)
    if course_or_dept_id:
        query = query.filter(SessionModel.course_or_dept_id == course_or_dept_id)
    start_dt, end_dt = _parse_date_range(start_date, end_date)
    if start_dt:
        query = query.filter(SessionModel.started_at >= start_dt)
    if end_dt:
        query = query.filter(SessionModel.started_at < end_dt)
    return query


@router.get("/entries", response_model=list[ReportRow])
def report_entries(
    course_or_dept_id: UUID | None = None,
    session_id: UUID | None = None,
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(SessionModel)
        .options(
            joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization),
        )
        .order_by(SessionModel.started_at.desc())
    )
    query = _apply_session_filters(query, course_or_dept_id, session_id, start_date, end_date)

    if current_user.role in {Role.teacher, Role.hr}:
        query = query.join(CourseOrDepartment).filter(
            (SessionModel.created_by == current_user.id)
            | (CourseOrDepartment.assigned_teacher_or_hr_id == current_user.id)
        )
    elif current_user.role in {Role.student, Role.employee}:
        query = query.join(CourseOrDepartment).join(Organization).filter(Organization.type == current_user.org_type)

    sessions = query.all()
    return [ReportRow(**build_session_summary(db, session_obj)) for session_obj in sessions]


@router.get("/session/{session_id}/csv")
def session_report(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.teacher, Role.hr, Role.admin)),
):
    session_obj = (
        db.query(SessionModel)
        .options(joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization))
        .filter(SessionModel.id == session_id)
        .first()
    )
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if current_user.role != Role.admin and session_obj.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to export this session")

    records = (
        db.query(Attendance)
        .options(joinedload(Attendance.user))
        .filter(Attendance.session_id == session_id)
        .order_by(Attendance.marked_at.asc())
        .all()
    )
    rows = [
        {
            "session_id": str(session_obj.id),
            "session_title": session_obj.title,
            "course_or_department": session_obj.course_or_dept.name,
            "organization": session_obj.course_or_dept.organization.name,
            "user_id": str(record.user.id),
            "name": record.user.name,
            "email": record.user.email,
            "role": record.user.role.value,
            "status": record.status.value,
            "marked_at": record.marked_at.isoformat(),
        }
        for record in records
    ]
    stream = io.StringIO()
    pd.DataFrame(rows).to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="session-{session_id}.csv"'},
    )


@router.get("/user/{user_id}/csv")
def user_report(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {Role.admin, Role.teacher, Role.hr} and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to export this report")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    records = (
        db.query(Attendance)
        .options(
            joinedload(Attendance.session)
            .joinedload(SessionModel.course_or_dept)
            .joinedload(CourseOrDepartment.organization)
        )
        .filter(Attendance.user_id == user_id)
        .order_by(Attendance.marked_at.asc())
        .all()
    )
    rows = [
        {
            "user_id": str(user.id),
            "name": user.name,
            "email": user.email,
            "session_id": str(record.session.id),
            "session_title": record.session.title,
            "course_or_department": record.session.course_or_dept.name,
            "organization": record.session.course_or_dept.organization.name,
            "status": record.status.value,
            "marked_at": record.marked_at.isoformat(),
        }
        for record in records
    ]
    stream = io.StringIO()
    pd.DataFrame(rows).to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="user-{user_id}.csv"'},
    )
