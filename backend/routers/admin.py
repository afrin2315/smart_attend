import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, hash_password, require_roles
from database import get_db
from models import Attendance, CourseOrDepartment, Organization, Role, Session as SessionModel, User
from schemas import (
    AdminOverview,
    CatalogResponse,
    CourseCreate,
    CourseRead,
    MessageResponse,
    OrganizationCreate,
    OrganizationRead,
    UserCreate,
    UserPublic,
    UserRead,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _target_role_count(db: Session, organization_type):
    role = Role.student if organization_type.value == "college" else Role.employee
    return db.query(User).filter(User.role == role, User.org_type == organization_type).count()


def _session_summary(db: Session, session_obj: SessionModel):
    attendance_count = db.query(Attendance).filter(Attendance.session_id == session_obj.id).count()
    target_count = _target_role_count(db, session_obj.course_or_dept.organization.type)
    return {
        "id": session_obj.id,
        "title": session_obj.title,
        "course_or_dept_id": session_obj.course_or_dept_id,
        "created_by": session_obj.created_by,
        "session_qr_code": session_obj.session_qr_code,
        "started_at": session_obj.started_at,
        "expires_at": session_obj.expires_at,
        "is_active": session_obj.is_active,
        "attendance_count": attendance_count,
        "target_count": target_count,
        "course_or_dept_name": session_obj.course_or_dept.name,
        "organization_name": session_obj.course_or_dept.organization.name,
        "organization_type": session_obj.course_or_dept.organization.type,
    }


@router.get("/users", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin, Role.teacher, Role.hr)),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if current_user.role == Role.teacher:
        if payload.role != Role.student:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teachers can only create student accounts")
        if payload.org_type != current_user.org_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student org type must match the teacher organization")

    if current_user.role == Role.hr:
        if payload.role != Role.employee:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR can only create employee accounts")
        if payload.org_type != current_user.org_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee org type must match the HR organization")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        org_type=payload.org_type,
        personal_qr_code=secrets.token_urlsafe(24),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()
    return MessageResponse(message="User deleted")


@router.get("/organizations", response_model=list[OrganizationRead])
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    return db.query(Organization).order_by(Organization.name.asc()).all()


@router.post("/organizations", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    existing = db.query(Organization).filter(func.lower(Organization.name) == payload.name.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization already exists")

    organization = Organization(name=payload.name, type=payload.type)
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return organization


@router.get("/courses", response_model=list[CourseRead])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    return (
        db.query(CourseOrDepartment)
        .options(
            joinedload(CourseOrDepartment.organization),
            joinedload(CourseOrDepartment.assigned_teacher_or_hr),
        )
        .order_by(CourseOrDepartment.name.asc())
        .all()
    )


@router.post("/courses", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    organization = db.query(Organization).filter(Organization.id == payload.org_id).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    assigned_user = None
    if payload.assigned_teacher_or_hr_id:
        assigned_user = db.query(User).filter(User.id == payload.assigned_teacher_or_hr_id).first()
        if not assigned_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found")
        if assigned_user.role not in {Role.teacher, Role.hr}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user must be teacher or HR")
        if assigned_user.org_type != organization.type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assigned user org type mismatch")

    course = CourseOrDepartment(
        name=payload.name,
        org_id=payload.org_id,
        assigned_teacher_or_hr_id=payload.assigned_teacher_or_hr_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return (
        db.query(CourseOrDepartment)
        .options(
            joinedload(CourseOrDepartment.organization),
            joinedload(CourseOrDepartment.assigned_teacher_or_hr),
        )
        .filter(CourseOrDepartment.id == course.id)
        .first()
    )


@router.get("/catalog", response_model=CatalogResponse)
def catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    organizations = db.query(Organization).order_by(Organization.name.asc()).all()
    courses = (
        db.query(CourseOrDepartment)
        .options(
            joinedload(CourseOrDepartment.organization),
            joinedload(CourseOrDepartment.assigned_teacher_or_hr),
        )
        .order_by(CourseOrDepartment.name.asc())
        .all()
    )
    staff = (
        db.query(User)
        .filter(User.role.in_([Role.teacher, Role.hr]))
        .order_by(User.name.asc())
        .all()
    )
    return CatalogResponse(
        organizations=organizations,
        courses_or_departments=courses,
        teachers_or_hr=[UserPublic.model_validate(member) for member in staff],
    )


@router.get("/overview", response_model=AdminOverview)
def overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.admin)),
):
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    total_users = db.query(User).count()
    sessions_today = (
        db.query(SessionModel)
        .filter(SessionModel.started_at >= start_of_day, SessionModel.started_at < end_of_day)
        .count()
    )

    total_attendance = db.query(Attendance).count()
    eligible_users = db.query(User).filter(User.role.in_([Role.student, Role.employee])).count()
    total_sessions = db.query(SessionModel).count()
    denominator = max(eligible_users * total_sessions, 1)
    attendance_rate = round((total_attendance / denominator) * 100, 2)

    recent_sessions = (
        db.query(SessionModel)
        .options(
            joinedload(SessionModel.course_or_dept).joinedload(CourseOrDepartment.organization),
        )
        .order_by(SessionModel.started_at.desc())
        .limit(5)
        .all()
    )

    return AdminOverview(
        total_users=total_users,
        sessions_today=sessions_today,
        attendance_rate=attendance_rate,
        recent_sessions=[_session_summary(db, session_obj) for session_obj in recent_sessions],
    )
