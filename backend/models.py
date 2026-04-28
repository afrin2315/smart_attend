import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import relationship

from database import Base


class Role(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"
    hr = "hr"
    employee = "employee"


class OrgType(str, enum.Enum):
    college = "college"
    industry = "industry"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    rejected = "rejected"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    type = Column(Enum(OrgType, name="org_type_enum"), nullable=False)

    courses_or_departments = relationship(
        "CourseOrDepartment",
        back_populates="organization",
        cascade="all, delete-orphan",
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(Role, name="role_enum"), nullable=False)
    org_type = Column(Enum(OrgType, name="org_type_enum"), nullable=False)
    personal_qr_code = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sessions_created = relationship(
        "Session",
        back_populates="creator",
        cascade="all, delete-orphan",
        foreign_keys="Session.created_by",
    )
    attendance_records = relationship(
        "Attendance",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    assigned_courses = relationship(
        "CourseOrDepartment",
        back_populates="assigned_teacher_or_hr",
        foreign_keys="CourseOrDepartment.assigned_teacher_or_hr_id",
    )


class CourseOrDepartment(Base):
    __tablename__ = "courses_or_departments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    org_id = Column(Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    assigned_teacher_or_hr_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    organization = relationship("Organization", back_populates="courses_or_departments")
    assigned_teacher_or_hr = relationship(
        "User",
        back_populates="assigned_courses",
        foreign_keys=[assigned_teacher_or_hr_id],
    )
    sessions = relationship(
        "Session",
        back_populates="course_or_dept",
        cascade="all, delete-orphan",
    )


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    course_or_dept_id = Column(
        Uuid(as_uuid=True),
        ForeignKey("courses_or_departments.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_qr_code = Column(String(255), unique=True, index=True, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    creator = relationship("User", back_populates="sessions_created", foreign_keys=[created_by])
    course_or_dept = relationship("CourseOrDepartment", back_populates="sessions")
    attendance_records = relationship(
        "Attendance",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("session_id", "user_id", name="uq_attendance_session_user"),)

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(Uuid(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    marked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(Enum(AttendanceStatus, name="attendance_status_enum"), nullable=False)

    session = relationship("Session", back_populates="attendance_records")
    user = relationship("User", back_populates="attendance_records")
