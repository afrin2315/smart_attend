import { useEffect, useState } from "react";

import api, { downloadFile } from "../api/client";
import { useAuth } from "../context/AuthContext";

const Reports = () => {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState({ courses_or_departments: [] });
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    course_or_dept_id: "",
    session_id: "",
    start_date: "",
    end_date: ""
  });
  const [loading, setLoading] = useState(true);

  const loadReportData = async (activeFilters = filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
    const [catalogRes, rowsRes] = await Promise.all([
      api.get("/sessions/catalog"),
      api.get(`/reports/entries${params.toString() ? `?${params.toString()}` : ""}`)
    ]);
    setCatalog(catalogRes.data);
    setRows(rowsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReportData();
  }, []);

  const handleApply = (event) => {
    event.preventDefault();
    loadReportData(filters);
  };

  const uniqueSessions = rows.map((row) => ({ id: row.id, title: row.title }));

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div className="eyebrow">Reports</div>
        <h1 className="section-title">Export attendance with filters.</h1>
        <p className="section-copy">
          Filter by date range, course or department, and session. Download a session CSV row by row, or export your full personal history.
        </p>
      </section>

      <form className="card bg-gradient-to-br from-white to-slate-50 p-6" onSubmit={handleApply}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="label">Course / Department</label>
            <select
              className="input"
              value={filters.course_or_dept_id}
              onChange={(event) => setFilters((current) => ({ ...current, course_or_dept_id: event.target.value }))}
            >
              <option value="">All</option>
              {catalog.courses_or_departments.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session</label>
            <select
              className="input"
              value={filters.session_id}
              onChange={(event) => setFilters((current) => ({ ...current, session_id: event.target.value }))}
            >
              <option value="">All</option>
              {uniqueSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input
              className="input"
              type="date"
              value={filters.start_date}
              onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              className="input"
              type="date"
              value={filters.end_date}
              onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="btn-primary">
            Apply Filters
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => downloadFile(`/reports/user/${user.id}/csv`, `attendance-${user.id}.csv`)}
          >
            Export My CSV
          </button>
        </div>
      </form>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Filtered Sessions</h2>
            <p className="mt-1 text-sm text-slate-500">Download session exports directly from the table.</p>
          </div>
        </div>
        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-500">Loading report data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Session</th>
                  <th className="px-6 py-4 font-semibold">Course / Department</th>
                  <th className="px-6 py-4 font-semibold">Started</th>
                  <th className="px-6 py-4 font-semibold">Attendance</th>
                  <th className="px-6 py-4 font-semibold">Export</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.title}</td>
                    <td className="px-6 py-4 text-slate-500">{row.course_or_dept_name}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(row.started_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {row.attendance_count} / {row.target_count}
                    </td>
                    <td className="px-6 py-4">
                      {(user.role === "admin" || user.role === "teacher" || user.role === "hr") ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => downloadFile(`/reports/session/${row.id}/csv`, `session-${row.id}.csv`)}
                        >
                          Export CSV
                        </button>
                      ) : (
                        <span className="text-slate-400">Restricted</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                      No sessions matched the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Reports;
