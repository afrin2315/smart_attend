from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect

from auth import hash_password
from database import SessionLocal, engine
from models import Attendance, AttendanceStatus, CourseOrDepartment, OrgType, Organization, Role, Session, User


def utc_now():
    return datetime.now(timezone.utc)


def get_or_create_user(db, *, name, email, password, role, org_type):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        org_type=org_type,
        personal_qr_code=f"{role.value}-{email.replace('@', '-at-')}",
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_organization(db, *, name, org_type):
    organization = db.query(Organization).filter(Organization.name == name).first()
    if organization:
        return organization
    organization = Organization(name=name, type=org_type)
    db.add(organization)
    db.flush()
    return organization


def get_or_create_course(db, *, name, org_id, assigned_user_id):
    course = db.query(CourseOrDepartment).filter(CourseOrDepartment.name == name).first()
    if course:
        if course.assigned_teacher_or_hr_id != assigned_user_id:
            course.assigned_teacher_or_hr_id = assigned_user_id
            db.flush()
        return course
    course = CourseOrDepartment(
        name=name,
        org_id=org_id,
        assigned_teacher_or_hr_id=assigned_user_id,
    )
    db.add(course)
    db.flush()
    return course


def get_or_create_session(
    db,
    *,
    title,
    course_id,
    created_by,
    qr_code,
    started_at,
    duration_minutes,
    is_active=False,
):
    session_record = db.query(Session).filter(Session.session_qr_code == qr_code).first()
    expires_at = started_at + timedelta(minutes=duration_minutes)
    if session_record:
        session_record.title = title
        session_record.course_or_dept_id = course_id
        session_record.created_by = created_by
        session_record.started_at = started_at
        session_record.expires_at = expires_at
        session_record.is_active = is_active
        db.flush()
        return session_record

    session_record = Session(
        title=title,
        course_or_dept_id=course_id,
        created_by=created_by,
        session_qr_code=qr_code,
        started_at=started_at,
        expires_at=expires_at,
        is_active=is_active,
    )
    db.add(session_record)
    db.flush()
    return session_record


def add_attendance(db, *, session_record, user, marked_at, status):
    existing = (
        db.query(Attendance)
        .filter(Attendance.session_id == session_record.id, Attendance.user_id == user.id)
        .first()
    )
    if existing:
        existing.marked_at = marked_at
        existing.status = status
        db.flush()
        return existing

    attendance = Attendance(
        session_id=session_record.id,
        user_id=user.id,
        marked_at=marked_at,
        status=status,
    )
    db.add(attendance)
    db.flush()
    return attendance


def seed_college(db):
    college = get_or_create_organization(db, name="SmartAttend College", org_type=OrgType.college)

    admin = get_or_create_user(
        db,
        name="Admin User",
        email="admin@smartattend.com",
        password="Admin@123",
        role=Role.admin,
        org_type=OrgType.college,
    )
    teacher = get_or_create_user(
        db,
        name="Tina Teacher",
        email="teacher@smartattend.com",
        password="Teacher@123",
        role=Role.teacher,
        org_type=OrgType.college,
    )
    assistant_teacher = get_or_create_user(
        db,
        name="Rahul Menon",
        email="rahul.teacher@smartattend.com",
        password="Teacher@123",
        role=Role.teacher,
        org_type=OrgType.college,
    )

    students = [
        get_or_create_user(
            db,
            name="Sara Student",
            email="student@smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Ayaan Malik",
            email="ayaan@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Nisha Verma",
            email="nisha@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Rohan Das",
            email="rohan@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Priya Sen",
            email="priya@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Kabir Shah",
            email="kabir@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Ananya Iyer",
            email="ananya@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
        get_or_create_user(
            db,
            name="Dev Khanna",
            email="dev@student.smartattend.com",
            password="Student@123",
            role=Role.student,
            org_type=OrgType.college,
        ),
    ]

    data_structures = get_or_create_course(
        db,
        name="Data Structures",
        org_id=college.id,
        assigned_user_id=teacher.id,
    )
    dbms = get_or_create_course(
        db,
        name="Database Management Systems",
        org_id=college.id,
        assigned_user_id=teacher.id,
    )
    algorithms = get_or_create_course(
        db,
        name="Algorithms Lab",
        org_id=college.id,
        assigned_user_id=teacher.id,
    )
    operating_systems = get_or_create_course(
        db,
        name="Operating Systems",
        org_id=college.id,
        assigned_user_id=assistant_teacher.id,
    )
    computer_networks = get_or_create_course(
        db,
        name="Computer Networks",
        org_id=college.id,
        assigned_user_id=assistant_teacher.id,
    )

    now = utc_now()
    session_specs = [
        (
            "Data Structures - Lecture 09",
            data_structures,
            teacher,
            "college-ds-09",
            now - timedelta(days=12, hours=3),
            90,
            False,
            [
                (students[0], 5, AttendanceStatus.present),
                (students[1], 11, AttendanceStatus.present),
                (students[2], 18, AttendanceStatus.late),
                (students[3], 9, AttendanceStatus.present),
            ],
        ),
        (
            "DBMS - Query Optimization",
            dbms,
            teacher,
            "college-dbms-07",
            now - timedelta(days=8, hours=2),
            75,
            False,
            [
                (students[0], 7, AttendanceStatus.present),
                (students[2], 8, AttendanceStatus.present),
                (students[3], 22, AttendanceStatus.late),
                (students[4], 10, AttendanceStatus.present),
            ],
        ),
        (
            "Algorithms Lab - Graph Traversal",
            algorithms,
            teacher,
            "college-algo-04",
            now - timedelta(days=4, hours=1),
            120,
            False,
            [
                (students[0], 4, AttendanceStatus.present),
                (students[1], 6, AttendanceStatus.present),
                (students[2], 13, AttendanceStatus.present),
                (students[4], 21, AttendanceStatus.late),
            ],
        ),
        (
            "Data Structures - Lecture 12",
            data_structures,
            teacher,
            "college-ds-12-live",
            now - timedelta(minutes=25),
            90,
            True,
            [
                (students[0], 3, AttendanceStatus.present),
                (students[1], 6, AttendanceStatus.present),
                (students[2], 17, AttendanceStatus.late),
            ],
        ),
        (
            "Operating Systems - Process Scheduling",
            operating_systems,
            assistant_teacher,
            "college-os-03",
            now - timedelta(days=15, hours=2),
            85,
            False,
            [
                (students[0], 5, AttendanceStatus.present),
                (students[4], 7, AttendanceStatus.present),
                (students[5], 9, AttendanceStatus.present),
                (students[6], 19, AttendanceStatus.late),
                (students[7], 8, AttendanceStatus.present),
            ],
        ),
        (
            "Computer Networks - Routing Basics",
            computer_networks,
            assistant_teacher,
            "college-cn-02",
            now - timedelta(days=11, hours=1),
            80,
            False,
            [
                (students[1], 6, AttendanceStatus.present),
                (students[2], 12, AttendanceStatus.present),
                (students[3], 17, AttendanceStatus.late),
                (students[6], 10, AttendanceStatus.present),
                (students[7], 9, AttendanceStatus.present),
            ],
        ),
        (
            "DBMS - Indexing Workshop",
            dbms,
            teacher,
            "college-dbms-09",
            now - timedelta(days=7, hours=3),
            100,
            False,
            [
                (students[0], 5, AttendanceStatus.present),
                (students[2], 7, AttendanceStatus.present),
                (students[4], 15, AttendanceStatus.present),
                (students[5], 18, AttendanceStatus.late),
                (students[7], 12, AttendanceStatus.present),
            ],
        ),
        (
            "Algorithms Lab - Dynamic Programming",
            algorithms,
            teacher,
            "college-algo-05",
            now - timedelta(days=5, hours=4),
            110,
            False,
            [
                (students[1], 5, AttendanceStatus.present),
                (students[2], 8, AttendanceStatus.present),
                (students[3], 10, AttendanceStatus.present),
                (students[5], 24, AttendanceStatus.late),
                (students[6], 7, AttendanceStatus.present),
            ],
        ),
        (
            "Operating Systems - Memory Management Live",
            operating_systems,
            assistant_teacher,
            "college-os-live",
            now - timedelta(minutes=40),
            95,
            True,
            [
                (students[0], 4, AttendanceStatus.present),
                (students[5], 8, AttendanceStatus.present),
                (students[6], 13, AttendanceStatus.present),
                (students[7], 19, AttendanceStatus.late),
            ],
        ),
    ]

    for title, course, creator, qr_code, started_at, duration, is_active, attendance_rows in session_specs:
        session_record = get_or_create_session(
            db,
            title=title,
            course_id=course.id,
            created_by=creator.id,
            qr_code=qr_code,
            started_at=started_at,
            duration_minutes=duration,
            is_active=is_active,
        )
        for user, offset_minutes, status in attendance_rows:
            add_attendance(
                db,
                session_record=session_record,
                user=user,
                marked_at=started_at + timedelta(minutes=offset_minutes),
                status=status,
            )

    return admin, teacher, assistant_teacher, students


def seed_industry(db):
    industry = get_or_create_organization(db, name="SmartAttend Industries", org_type=OrgType.industry)

    hr = get_or_create_user(
        db,
        name="Hari HR",
        email="hr@smartattend.com",
        password="Hr@123456",
        role=Role.hr,
        org_type=OrgType.industry,
    )
    people_ops = get_or_create_user(
        db,
        name="Leena Joseph",
        email="leena.hr@smartattend.com",
        password="Hr@123456",
        role=Role.hr,
        org_type=OrgType.industry,
    )

    employees = [
        get_or_create_user(
            db,
            name="Eshan Employee",
            email="employee@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Meera Nair",
            email="meera@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Arjun Paul",
            email="arjun@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Fatima Rahman",
            email="fatima@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Vikram Rao",
            email="vikram@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Noor Ahmed",
            email="noor@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
        get_or_create_user(
            db,
            name="Sneha Kapoor",
            email="sneha@smartattend.com",
            password="Employee@123",
            role=Role.employee,
            org_type=OrgType.industry,
        ),
    ]

    onboarding = get_or_create_course(
        db,
        name="Employee Onboarding",
        org_id=industry.id,
        assigned_user_id=hr.id,
    )
    safety = get_or_create_course(
        db,
        name="Factory Safety Induction",
        org_id=industry.id,
        assigned_user_id=hr.id,
    )
    compliance = get_or_create_course(
        db,
        name="Quarterly Compliance Briefing",
        org_id=industry.id,
        assigned_user_id=hr.id,
    )
    leadership = get_or_create_course(
        db,
        name="Team Lead Orientation",
        org_id=industry.id,
        assigned_user_id=people_ops.id,
    )
    payroll = get_or_create_course(
        db,
        name="Payroll Systems Walkthrough",
        org_id=industry.id,
        assigned_user_id=people_ops.id,
    )

    now = utc_now()
    session_specs = [
        (
            "New Hire Onboarding - Batch A",
            onboarding,
            hr,
            "industry-onboarding-a",
            now - timedelta(days=10, hours=4),
            90,
            False,
            [
                (employees[0], 5, AttendanceStatus.present),
                (employees[1], 7, AttendanceStatus.present),
                (employees[2], 19, AttendanceStatus.late),
            ],
        ),
        (
            "Factory Safety Drill",
            safety,
            hr,
            "industry-safety-02",
            now - timedelta(days=6, hours=5),
            60,
            False,
            [
                (employees[0], 4, AttendanceStatus.present),
                (employees[1], 5, AttendanceStatus.present),
                (employees[2], 8, AttendanceStatus.present),
                (employees[3], 17, AttendanceStatus.late),
            ],
        ),
        (
            "Compliance Refresher - Q2",
            compliance,
            hr,
            "industry-compliance-q2",
            now - timedelta(days=2, hours=3),
            75,
            False,
            [
                (employees[0], 6, AttendanceStatus.present),
                (employees[2], 11, AttendanceStatus.present),
                (employees[3], 13, AttendanceStatus.present),
            ],
        ),
        (
            "Onboarding Q&A Live",
            onboarding,
            hr,
            "industry-onboarding-live",
            now - timedelta(minutes=35),
            80,
            True,
            [
                (employees[0], 4, AttendanceStatus.present),
                (employees[1], 9, AttendanceStatus.present),
            ],
        ),
        (
            "Team Lead Orientation - Cohort 1",
            leadership,
            people_ops,
            "industry-lead-01",
            now - timedelta(days=13, hours=2),
            70,
            False,
            [
                (employees[1], 4, AttendanceStatus.present),
                (employees[3], 9, AttendanceStatus.present),
                (employees[4], 14, AttendanceStatus.present),
                (employees[5], 17, AttendanceStatus.late),
            ],
        ),
        (
            "Payroll Walkthrough - New Portal",
            payroll,
            people_ops,
            "industry-payroll-01",
            now - timedelta(days=9, hours=1),
            65,
            False,
            [
                (employees[0], 5, AttendanceStatus.present),
                (employees[2], 8, AttendanceStatus.present),
                (employees[4], 11, AttendanceStatus.present),
                (employees[6], 18, AttendanceStatus.late),
            ],
        ),
        (
            "Factory Safety Drill - Evening Shift",
            safety,
            hr,
            "industry-safety-03",
            now - timedelta(days=3, hours=6),
            60,
            False,
            [
                (employees[0], 4, AttendanceStatus.present),
                (employees[3], 6, AttendanceStatus.present),
                (employees[5], 9, AttendanceStatus.present),
                (employees[6], 16, AttendanceStatus.late),
            ],
        ),
        (
            "Team Lead Orientation Live",
            leadership,
            people_ops,
            "industry-lead-live",
            now - timedelta(minutes=20),
            75,
            True,
            [
                (employees[1], 5, AttendanceStatus.present),
                (employees[4], 9, AttendanceStatus.present),
                (employees[6], 16, AttendanceStatus.late),
            ],
        ),
    ]

    for title, course, creator, qr_code, started_at, duration, is_active, attendance_rows in session_specs:
        session_record = get_or_create_session(
            db,
            title=title,
            course_id=course.id,
            created_by=creator.id,
            qr_code=qr_code,
            started_at=started_at,
            duration_minutes=duration,
            is_active=is_active,
        )
        for user, offset_minutes, status in attendance_rows:
            add_attendance(
                db,
                session_record=session_record,
                user=user,
                marked_at=started_at + timedelta(minutes=offset_minutes),
                status=status,
            )

    return hr, people_ops, employees


def main():
    inspector = inspect(engine)
    required_tables = {"organizations", "users", "courses_or_departments", "sessions", "attendance"}
    existing_tables = set(inspector.get_table_names())
    missing_tables = required_tables - existing_tables
    if missing_tables:
        raise RuntimeError(
            "Database schema is missing required tables. Run 'alembic upgrade head' before seeding. "
            f"Missing: {', '.join(sorted(missing_tables))}"
        )

    db = SessionLocal()
    try:
        seed_college(db)
        seed_industry(db)
        db.commit()
        print("Expanded demo seed complete.")
        print("Admin: admin@smartattend.com / Admin@123")
        print("Teacher: teacher@smartattend.com / Teacher@123")
        print("HR: hr@smartattend.com / Hr@123456")
        print("Student: student@smartattend.com / Student@123")
        print("Employee: employee@smartattend.com / Employee@123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
