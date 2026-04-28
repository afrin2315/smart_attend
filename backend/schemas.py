from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from models import AttendanceStatus, OrgType, Role


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    role: Role
    org_type: OrgType


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRead(UserBase, ORMModel):
    id: UUID
    personal_qr_code: str
    created_at: datetime


class UserPublic(ORMModel):
    id: UUID
    name: str
    email: EmailStr
    role: Role
    org_type: OrgType


class UserMe(UserPublic):
    personal_qr_code: str
    personal_qr_image: str


class OrganizationBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    type: OrgType


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationRead(OrganizationBase, ORMModel):
    id: UUID


class CourseBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    org_id: UUID
    assigned_teacher_or_hr_id: Optional[UUID] = None


class CourseCreate(CourseBase):
    pass


class CourseRead(ORMModel):
    id: UUID
    name: str
    org_id: UUID
    assigned_teacher_or_hr_id: Optional[UUID] = None
    organization: OrganizationRead
    assigned_teacher_or_hr: Optional[UserPublic] = None


class SessionCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    course_or_dept_id: UUID
    duration_minutes: int = Field(gt=0, le=360)


class SessionRead(ORMModel):
    id: UUID
    title: str
    course_or_dept_id: UUID
    created_by: UUID
    session_qr_code: str
    started_at: datetime
    expires_at: datetime
    is_active: bool


class SessionSummary(SessionRead):
    attendance_count: int
    target_count: int
    course_or_dept_name: str
    organization_name: str
    organization_type: OrgType


class SessionWithQR(SessionSummary):
    session_qr_image: str


class SessionDetail(SessionWithQR):
    created_by_name: str


class AttendanceScanRequest(BaseModel):
    session_qr_code: str = Field(min_length=8)


class AttendanceScanResponse(BaseModel):
    status: AttendanceStatus
    message: str
    marked_at: Optional[datetime] = None


class AttendanceRead(ORMModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    marked_at: datetime
    status: AttendanceStatus


class AttendanceWithUser(ORMModel):
    id: UUID
    marked_at: datetime
    status: AttendanceStatus
    user: UserPublic


class AttendanceWithSession(ORMModel):
    id: UUID
    marked_at: datetime
    status: AttendanceStatus
    session: SessionSummary


class AdminOverview(BaseModel):
    total_users: int
    sessions_today: int
    attendance_rate: float
    recent_sessions: list[SessionSummary]


class CatalogResponse(BaseModel):
    organizations: list[OrganizationRead]
    courses_or_departments: list[CourseRead]
    teachers_or_hr: list[UserPublic]


class ReportRow(BaseModel):
    id: UUID
    title: str
    course_or_dept_name: str
    organization_name: str
    started_at: datetime
    expires_at: datetime
    attendance_count: int
    target_count: int
    is_active: bool
