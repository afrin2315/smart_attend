import { useMemo, useState } from "react";

const statusClasses = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700"
};

const AttendanceTable = ({ rows, showSession = false }) => {
  const [sortBy, setSortBy] = useState("marked_at");
  const [direction, setDirection] = useState("desc");

  const sortedRows = useMemo(() => {
    const cloned = [...rows];
    cloned.sort((a, b) => {
      const left = sortBy === "name" ? (a.user?.name || a.session?.title || "") : a[sortBy];
      const right = sortBy === "name" ? (b.user?.name || b.session?.title || "") : b[sortBy];
      if (left < right) {
        return direction === "asc" ? -1 : 1;
      }
      if (left > right) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return cloned;
  }, [direction, rows, sortBy]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setDirection("asc");
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/90 text-left text-slate-500">
            <tr>
              <th className="px-5 py-4">
                <button type="button" onClick={() => toggleSort("name")} className="font-semibold transition hover:text-slate-800">
                  {showSession ? "Session" : "Name"}
                </button>
              </th>
              <th className="px-5 py-4">Role</th>
              {showSession ? <th className="px-5 py-4">Course / Department</th> : null}
              <th className="px-5 py-4">
                <button type="button" onClick={() => toggleSort("marked_at")} className="font-semibold transition hover:text-slate-800">
                  Marked At
                </button>
              </th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => (
              <tr key={row.id} className={`transition hover:bg-brand-50/50 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}>
                <td className="px-5 py-4 font-semibold text-slate-900">
                  {showSession ? row.session?.title : row.user?.name}
                </td>
                <td className="px-5 py-4 capitalize text-slate-500">
                  {showSession ? row.session?.organization_type : row.user?.role}
                </td>
                {showSession ? (
                  <td className="px-5 py-4 text-slate-500">{row.session?.course_or_dept_name}</td>
                ) : null}
                <td className="px-5 py-4 text-slate-500">
                  {new Date(row.marked_at).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      statusClasses[row.status] || statusClasses.rejected
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {!sortedRows.length ? (
              <tr>
                <td
                  colSpan={showSession ? 5 : 4}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  No attendance records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
