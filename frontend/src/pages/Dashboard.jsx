import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import api, { downloadFile } from "../api/client";
import AttendanceTable from "../components/AttendanceTable";
import StatsCard from "../components/StatsCard";
import { useAuth } from "../context/AuthContext";

const chartColors = ["#4338ca", "#cbd5e1"];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState({ organizations: [], courses_or_departments: [], teachers_or_hr: [] });
  const [activeSessions, setActiveSessions] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [adminForms, setAdminForms] = useState({
    user: { name: "", email: "", password: "", role: "student", org_type: "college" },
    organization: { name: "", type: "college" },
    course: { name: "", org_id: "", assigned_teacher_or_hr_id: "" }
  });
  const [staffUserForm, setStaffUserForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [feedback, setFeedback] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      if (user.role === "admin") {
        const [overviewRes, usersRes, catalogRes, sessionsRes] = await Promise.all([
          api.get("/admin/overview"),
          api.get("/admin/users"),
          api.get("/admin/catalog"),
          api.get("/sessions/active")
        ]);
        setOverview(overviewRes.data);
        setUsers(usersRes.data);
        setCatalog(catalogRes.data);
        setActiveSessions(sessionsRes.data);
      } else if (user.role === "teacher" || user.role === "hr") {
        const [catalogRes, sessionsRes] = await Promise.all([
          api.get("/sessions/catalog"),
          api.get("/sessions/active")
        ]);
        setCatalog(catalogRes.data);
        setActiveSessions(sessionsRes.data);
      } else {
        const historyRes = await api.get("/attendance/me");
        setAttendanceHistory(historyRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const closeSession = async (sessionId) => {
    await api.patch(`/sessions/${sessionId}/close`);
    await loadData();
  };

  const handleAdminSubmit = async (event, type) => {
    event.preventDefault();
    setFeedback("");
    if (type === "user") {
      await api.post("/admin/users", adminForms.user);
      setAdminForms((current) => ({
        ...current,
        user: { name: "", email: "", password: "", role: "student", org_type: "college" }
      }));
      setFeedback("User created successfully.");
    }
    if (type === "organization") {
      await api.post("/admin/organizations", adminForms.organization);
      setAdminForms((current) => ({ ...current, organization: { name: "", type: "college" } }));
      setFeedback("Organization created successfully.");
    }
    if (type === "course") {
      await api.post("/admin/courses", {
        ...adminForms.course,
        assigned_teacher_or_hr_id: adminForms.course.assigned_teacher_or_hr_id || null
      });
      setAdminForms((current) => ({
        ...current,
        course: { name: "", org_id: "", assigned_teacher_or_hr_id: "" }
      }));
      setFeedback("Course or department created successfully.");
    }
    await loadData();
  };

  const handleStaffUserCreate = async (event) => {
    event.preventDefault();
    setFeedback("");
    const payload = {
      ...staffUserForm,
      role: user.role === "teacher" ? "student" : "employee",
      org_type: user.org_type
    };
    await api.post("/admin/users", payload);
    setStaffUserForm({ name: "", email: "", password: "" });
    setFeedback(
      user.role === "teacher"
        ? "Student account created successfully."
        : "Employee account created successfully."
    );
    await loadData();
  };

  if (loading) {
    return <div className="card p-8 text-slate-500">Loading dashboard...</div>;
  }

  if (user.role === "admin") {
    return (
      <div className="space-y-8">
        <section className="grid gap-5 md:grid-cols-3">
          <StatsCard label="Total Users" value={overview?.total_users || 0} />
          <StatsCard label="Sessions Today" value={overview?.sessions_today || 0} accent="emerald" />
          <StatsCard label="Attendance Rate" value={`${overview?.attendance_rate || 0}%`} accent="amber" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Recent Sessions</h2>
                <p className="mt-1 text-sm text-slate-500">Latest activity across SmartAttend.</p>
              </div>
              <Link to="/reports" className="btn-secondary">
                Open Reports
              </Link>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-3 font-semibold">Session</th>
                    <th className="pb-3 font-semibold">Course</th>
                    <th className="pb-3 font-semibold">Started</th>
                    <th className="pb-3 font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recent_sessions || []).map((session) => (
                    <tr key={session.id} className="border-t border-slate-100">
                      <td className="py-4 font-semibold text-slate-900">{session.title}</td>
                      <td className="py-4 text-slate-500">{session.course_or_dept_name}</td>
                      <td className="py-4 text-slate-500">{new Date(session.started_at).toLocaleString()}</td>
                      <td className="py-4 text-slate-500">
                        {session.attendance_count} / {session.target_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-white to-slate-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">Quick Add User</h2>
            <p className="mt-1 text-sm text-slate-500">Provision users and organization structure from one place.</p>
            {feedback ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
            <form className="mt-5 space-y-4" onSubmit={(event) => handleAdminSubmit(event, "user")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={adminForms.user.name}
                    onChange={(event) => setAdminForms((current) => ({ ...current, user: { ...current.user, name: event.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={adminForms.user.email}
                    onChange={(event) => setAdminForms((current) => ({ ...current, user: { ...current.user, email: event.target.value } }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    value={adminForms.user.password}
                    onChange={(event) => setAdminForms((current) => ({ ...current, user: { ...current.user, password: event.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={adminForms.user.role}
                    onChange={(event) => setAdminForms((current) => ({ ...current, user: { ...current.user, role: event.target.value } }))}
                  >
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label className="label">Org Type</label>
                  <select
                    className="input"
                    value={adminForms.user.org_type}
                    onChange={(event) => setAdminForms((current) => ({ ...current, user: { ...current.user, org_type: event.target.value } }))}
                  >
                    <option value="college">College</option>
                    <option value="industry">Industry</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary">
                Add User
              </button>
            </form>

            <form className="mt-8 space-y-4 border-t border-slate-100 pt-6" onSubmit={(event) => handleAdminSubmit(event, "organization")}>
              <h3 className="text-lg font-bold text-slate-900">Create Organization</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Organization Name</label>
                  <input
                    className="input"
                    value={adminForms.organization.name}
                    onChange={(event) => setAdminForms((current) => ({ ...current, organization: { ...current.organization, name: event.target.value } }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className="input"
                    value={adminForms.organization.type}
                    onChange={(event) => setAdminForms((current) => ({ ...current, organization: { ...current.organization, type: event.target.value } }))}
                  >
                    <option value="college">College</option>
                    <option value="industry">Industry</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-secondary">
                Add Organization
              </button>
            </form>

            <form className="mt-8 space-y-4 border-t border-slate-100 pt-6" onSubmit={(event) => handleAdminSubmit(event, "course")}>
              <h3 className="text-lg font-bold text-slate-900">Create Course / Department</h3>
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={adminForms.course.name}
                  onChange={(event) => setAdminForms((current) => ({ ...current, course: { ...current.course, name: event.target.value } }))}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Organization</label>
                  <select
                    className="input"
                    value={adminForms.course.org_id}
                    onChange={(event) => setAdminForms((current) => ({ ...current, course: { ...current.course, org_id: event.target.value } }))}
                    required
                  >
                    <option value="">Select organization</option>
                    {catalog.organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Assigned Teacher / HR</label>
                  <select
                    className="input"
                    value={adminForms.course.assigned_teacher_or_hr_id}
                    onChange={(event) => setAdminForms((current) => ({ ...current, course: { ...current.course, assigned_teacher_or_hr_id: event.target.value } }))}
                  >
                    <option value="">Unassigned</option>
                    {catalog.teachers_or_hr.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-secondary">
                Add Course / Department
              </button>
            </form>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-900">Live Sessions</h2>
          <p className="mt-1 text-sm text-slate-500">All currently active sessions.</p>
          <div className="mt-5 grid gap-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="rounded-[28px] border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{session.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {session.course_or_dept_name} - {session.organization_name}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {session.attendance_count} / {session.target_count} marked
                  </div>
                </div>
              </div>
            ))}
            {!activeSessions.length ? <div className="text-sm text-slate-500">No active sessions right now.</div> : null}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-900">All Users</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Email</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Org Type</th>
                </tr>
              </thead>
              <tbody>
                {users.map((member) => (
                  <tr key={member.id} className="border-t border-slate-100">
                    <td className="py-4 font-semibold text-slate-900">{member.name}</td>
                    <td className="py-4 text-slate-500">{member.email}</td>
                    <td className="py-4 capitalize text-slate-500">{member.role}</td>
                    <td className="py-4 capitalize text-slate-500">{member.org_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  if (user.role === "teacher" || user.role === "hr") {
    return (
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-brand-800 via-brand-700 to-indigo-500 p-8 text-white lg:flex-row lg:items-center lg:justify-between">
          <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-20 h-24 w-24 rounded-full bg-indigo-200/20 blur-2xl" />
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">Session Control</div>
            <h1 className="mt-3 text-3xl font-extrabold">Manage attendance live.</h1>
            <p className="mt-3 max-w-2xl text-indigo-100/90">
              Create expiring session QRs, watch the live feed, and export clean reports when the session closes.
            </p>
          </div>
          <Link to="/session/create" className="btn-secondary border-white/20 bg-white text-brand-700 hover:bg-indigo-50">
            Create Session
          </Link>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <StatsCard label="Active Sessions" value={activeSessions.length} />
          <StatsCard
            label="Total Marks"
            value={activeSessions.reduce((sum, session) => sum + session.attendance_count, 0)}
            accent="emerald"
          />
          <StatsCard
            label="Available Courses"
            value={catalog.courses_or_departments.length}
            accent="amber"
          />
        </section>

        <section className="grid gap-5">
          <div className="card bg-gradient-to-br from-white to-slate-50 p-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {user.role === "teacher" ? "Create Student Account" : "Create Employee Account"}
              </h2>
              <p className="text-sm text-slate-500">
                {user.role === "teacher"
                  ? "Teachers can onboard students directly so they can start scanning session QR codes."
                  : "HR can onboard employees directly so they can join attendance sessions immediately."}
              </p>
            </div>
            {feedback ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </div>
            ) : null}
            <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleStaffUserCreate}>
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={staffUserForm.name}
                  onChange={(event) => setStaffUserForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={staffUserForm.email}
                  onChange={(event) => setStaffUserForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={staffUserForm.password}
                  onChange={(event) => setStaffUserForm((current) => ({ ...current, password: event.target.value }))}
                  minLength={8}
                  required
                />
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary w-full">
                  {user.role === "teacher" ? "Add Student" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>

          {activeSessions.map((session) => (
            <div key={session.id} className="card p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{session.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {session.course_or_dept_name} - expires {new Date(session.expires_at).toLocaleString()}
                  </p>
                  <div className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
                    {session.attendance_count} / {session.target_count} marked
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to={`/session/live/${session.id}`} className="btn-primary">
                    View Live
                  </Link>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => downloadFile(`/reports/session/${session.id}/csv`, `session-${session.id}.csv`)}
                  >
                    Export CSV
                  </button>
                  <button type="button" className="btn-danger" onClick={() => closeSession(session.id)}>
                    Close Session
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!activeSessions.length ? (
            <div className="card p-10 text-center text-slate-500">
              No active sessions yet. Create one to start attendance tracking.
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  const presentCount = attendanceHistory.filter((record) => record.status === "present").length;
  const totalCount = attendanceHistory.length;
  const lateCount = attendanceHistory.filter((record) => record.status === "late").length;
  const percentage = totalCount ? Math.round((presentCount / totalCount) * 100) : 0;
  const chartData = [
    { name: "Present", value: percentage },
    { name: "Remaining", value: Math.max(100 - percentage, 0) }
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-brand-800 via-brand-700 to-indigo-500 p-8 text-white">
          <div className="absolute -right-10 top-4 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-indigo-200/20 blur-2xl" />
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">Attendance Snapshot</div>
          <h1 className="mt-4 text-3xl font-extrabold">Your attendance is protected by dual verification.</h1>
          <p className="mt-3 max-w-2xl text-indigo-100/90">
            Every mark combines your logged-in identity with the temporary session QR, making proxy attendance far harder.
          </p>
          <Link to="/scan" className="mt-6 btn-secondary border-white/20 bg-white text-brand-700 hover:bg-indigo-50">
            Scan QR
          </Link>
        </div>

        <div className="card p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Attendance Rate</div>
          <div className="relative mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={60} outerRadius={82} stroke="none">
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-extrabold text-slate-900">{percentage}%</div>
              <div className="mt-1 max-w-[180px] text-sm text-slate-500">
                Present in on-time attendance
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatsCard label="Present" value={presentCount} accent="emerald" />
        <StatsCard label="Late" value={lateCount} accent="amber" />
        <StatsCard label="Sessions Marked" value={totalCount} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Recent Attendance</h2>
            <p className="mt-1 text-sm text-slate-500">Your latest classroom or workplace entries.</p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadFile(`/reports/user/${user.id}/csv`, `attendance-${user.id}.csv`)}
          >
            Export My CSV
          </button>
        </div>
        <AttendanceTable rows={attendanceHistory} showSession />
      </section>
    </div>
  );
};

export default Dashboard;
