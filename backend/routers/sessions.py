import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Set
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, require_roles
from database import get_db
from models import Attendance, CourseOrDepartment, Organization, Role, Session as SessionModel, User
from schemas import AttendanceWithUser, CatalogResponse, MessageResponse, SessionCreate, SessionDetail, SessionSummary, SessionWithQR
from utils.qr_generator import generate_qr_base64

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionWSManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active.setdefault(session_id, set()).add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id not in self.active:
            return
        self.active[session_id].discard(websocket)
        if not self.active[session_id]:
            self.active.pop(session_id, None)

    async def broadcast(self, session_id: str, message: dict):
        for socket in list(self.active.get(session_id, set())):
            try:
                await socket.send_json(message)
            except Exception:
                self.disconnect(session_id, socket)


session_ws_manager = SessionWSManager()


def utc_now():
    return datetime.now(timezone.utc)


def _target_role_count(db: Session, organization_type):
    role = Role.student if organization_type.value == "college" else Role.employee
    return db.query(User).filter(User.role == role, User.org_type == organization_type).count()


def build_session_summary(db: Session, session_obj: SessionModel) -> dict:
    organization = session_obj.course_or_dept.organization
    return {
        "id": session_obj.id,
        "title": session_obj.title,
        "course_or_dept_id": session_obj.course_or_dept_id,
        "created_by": session_obj.created_by,
        "session_qr_code": session_obj.session_qr_code,
        "started_at": session_obj.started_at,
        "expires_at": session_obj.expires_at,
        "is_active": session_obj.is_active,
        "attendance_count": db.query(Attendance).filter(Attendance.session_id == session_obj.id).count(),
        "target_count": _target_role_count(db, organization.type),
        "course_or_dept_name": session_obj.course_or_dept.name,
        "organization_name": organization.name,
        "organization_type": organization.type,
    }


def serialize_session_summary(summary: dict) -> dict:
    serialized = {}
    for key, value in summary.items():
        if isinstance(value, UUID):
            serialized[key] = str(value)
        elif isinstance(value, datetime):
            serialized[key] = value.isoformat()
        elif hasattr(value, "value"):
            serialized[key] = value.value
        else:
            serialized[key] = value
    return serialized


def get_session_or_404(db: Session, session_id: UUID) -> SessionModel:
    session_obj = (
        db.query(SessionModel)
        .options(
            joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization),
            joinedload(SessionModel.creator),
        )
        .filter(SessionModel.id == session_id)
        .first()
    )
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session_obj


def ensure_session_access(current_user: User, session_obj: SessionModel):
    org_type = session_obj.course_or_dept.organization.type
    if current_user.role == Role.admin:
        return
    if current_user.role in {Role.teacher, Role.hr}:
        if session_obj.created_by != current_user.id and session_obj.course_or_dept.assigned_teacher_or_hr_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this session")
        return
    if current_user.org_type != org_type:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this session")


@router.get("/catalog", response_model=CatalogResponse)
def session_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organizations_query = db.query(Organization)
    courses_query = db.query(CourseOrDepartment).options(
        joinedload(CourseOrDepartment.organization),
        joinedload(CourseOrDepartment.assigned_teacher_or_hr),
    )
    staff_query = db.query(User).filter(User.role.in_([Role.teacher, Role.hr]))

    if current_user.role != Role.admin:
        organizations_query = organizations_query.filter(Organization.type == current_user.org_type)
        courses_query = courses_query.join(Organization).filter(Organization.type == current_user.org_type)
        staff_query = staff_query.filter(User.org_type == current_user.org_type)
        if current_user.role in {Role.teacher, Role.hr}:
            courses_query = courses_query.filter(
                (CourseOrDepartment.assigned_teacher_or_hr_id == current_user.id)
                | (CourseOrDepartment.assigned_teacher_or_hr_id.is_(None))
            )

    return CatalogResponse(
        organizations=organizations_query.order_by(Organization.name.asc()).all(),
        courses_or_departments=courses_query.order_by(CourseOrDepartment.name.asc()).all(),
        teachers_or_hr=staff_query.order_by(User.name.asc()).all(),
    )


@router.post("/create", response_model=SessionWithQR, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.teacher, Role.hr)),
):
    course = (
        db.query(CourseOrDepartment)
        .options(joinedload(CourseOrDepartment.organization))
        .filter(CourseOrDepartment.id == payload.course_or_dept_id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course or department not found")
    if course.organization.type != current_user.org_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course organization type mismatch")
    if course.assigned_teacher_or_hr_id and course.assigned_teacher_or_hr_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This course is assigned to another staff member")

    started_at = utc_now()
    expires_at = started_at + timedelta(minutes=payload.duration_minutes)
    session_obj = SessionModel(
        title=payload.title,
        course_or_dept_id=payload.course_or_dept_id,
        created_by=current_user.id,
        session_qr_code=secrets.token_urlsafe(24),
        started_at=started_at,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    session_obj = get_session_or_404(db, session_obj.id)
    summary = build_session_summary(db, session_obj)
    return SessionWithQR(**summary, session_qr_image=generate_qr_base64(session_obj.session_qr_code))


@router.get("/active", response_model=list[SessionSummary])
def get_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = utc_now()
    query = (
        db.query(SessionModel)
        .options(
            joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization),
        )
        .filter(SessionModel.is_active.is_(True), SessionModel.expires_at > now)
    )

    if current_user.role in {Role.teacher, Role.hr}:
        query = query.join(CourseOrDepartment).filter(
            (SessionModel.created_by == current_user.id)
            | (CourseOrDepartment.assigned_teacher_or_hr_id == current_user.id)
        )
    elif current_user.role in {Role.student, Role.employee}:
        query = query.join(CourseOrDepartment).join(Organization).filter(Organization.type == current_user.org_type)

    sessions = query.order_by(SessionModel.started_at.desc()).all()
    return [SessionSummary(**build_session_summary(db, session_obj)) for session_obj in sessions]


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_obj = get_session_or_404(db, session_id)
    ensure_session_access(current_user, session_obj)
    summary = build_session_summary(db, session_obj)
    return SessionDetail(
        **summary,
        session_qr_image=generate_qr_base64(session_obj.session_qr_code),
        created_by_name=session_obj.creator.name,
    )


@router.patch("/{session_id}/close", response_model=MessageResponse)
def close_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.teacher, Role.hr, Role.admin)),
):
    session_obj = get_session_or_404(db, session_id)
    if current_user.role != Role.admin and session_obj.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the creator or admin can close this session")

    session_obj.is_active = False
    db.commit()
    return MessageResponse(message="Session closed")


@router.get("/{session_id}/attendance", response_model=list[AttendanceWithUser])
def session_attendance(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.teacher, Role.hr, Role.admin)),
):
    session_obj = get_session_or_404(db, session_id)
    ensure_session_access(current_user, session_obj)
    return (
        db.query(Attendance)
        .options(joinedload(Attendance.user))
        .filter(Attendance.session_id == session_id)
        .order_by(Attendance.marked_at.desc())
        .all()
    )


@router.websocket("/{session_id}/live")
async def live_session(session_id: str, websocket: WebSocket):
    await session_ws_manager.connect(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        session_ws_manager.disconnect(session_id, websocket)
