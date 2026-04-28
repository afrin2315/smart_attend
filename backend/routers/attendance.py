from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_roles
from database import get_db
from models import Attendance, AttendanceStatus, CourseOrDepartment, Role, Session as SessionModel, User
from routers.sessions import build_session_summary, serialize_session_summary, session_ws_manager, utc_now
from schemas import AttendanceScanRequest, AttendanceScanResponse, AttendanceWithSession

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/scan", response_model=AttendanceScanResponse)
async def scan_qr(
    payload: AttendanceScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.student, Role.employee)),
):
    session_obj = (
        db.query(SessionModel)
        .options(
            joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization),
        )
        .filter(SessionModel.session_qr_code == payload.session_qr_code)
        .first()
    )
    now = utc_now()

    if not session_obj:
        return AttendanceScanResponse(status=AttendanceStatus.rejected, message="Invalid QR code")

    if session_obj.course_or_dept.organization.type != current_user.org_type:
        return AttendanceScanResponse(status=AttendanceStatus.rejected, message="This session does not belong to your organization")

    if not session_obj.is_active or session_obj.expires_at <= now:
        session_obj.is_active = False
        db.commit()
        return AttendanceScanResponse(status=AttendanceStatus.rejected, message="Session expired or inactive")

    existing = (
        db.query(Attendance)
        .filter(Attendance.session_id == session_obj.id, Attendance.user_id == current_user.id)
        .first()
    )
    if existing:
        return AttendanceScanResponse(status=AttendanceStatus.rejected, message="Attendance already marked")

    status_value = (
        AttendanceStatus.present
        if now <= session_obj.started_at + timedelta(minutes=15)
        else AttendanceStatus.late
    )
    attendance = Attendance(
        session_id=session_obj.id,
        user_id=current_user.id,
        marked_at=now,
        status=status_value,
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    session_obj = (
        db.query(SessionModel)
        .options(joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization))
        .filter(SessionModel.id == session_obj.id)
        .first()
    )

    await session_ws_manager.broadcast(
        str(session_obj.id),
        {
            "type": "attendance_marked",
            "record": {
                "id": str(attendance.id),
                "marked_at": attendance.marked_at.isoformat(),
                "status": attendance.status.value,
                "user": {
                    "id": str(current_user.id),
                    "name": current_user.name,
                    "email": current_user.email,
                    "role": current_user.role.value,
                    "org_type": current_user.org_type.value,
                },
            },
            "session": serialize_session_summary(build_session_summary(db, session_obj)),
        },
    )

    return AttendanceScanResponse(
        status=status_value,
        message="Attendance marked successfully" if status_value == AttendanceStatus.present else "Marked late after the grace period",
        marked_at=attendance.marked_at,
    )


@router.get("/me", response_model=list[AttendanceWithSession])
def my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(Attendance)
        .options(
            joinedload(Attendance.session)
            .joinedload(SessionModel.course_or_dept)
            .joinedload(CourseOrDepartment.organization)
        )
        .filter(Attendance.user_id == current_user.id)
        .order_by(Attendance.marked_at.desc())
        .all()
    )
    payload = []
    for record in records:
        payload.append(
            AttendanceWithSession(
                id=record.id,
                marked_at=record.marked_at,
                status=record.status,
                session=build_session_summary(db, record.session),
            )
        )
    return payload
