import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../api/client";
import QRDisplay from "../components/QRDisplay";

const CreateSession = () => {
  const [catalog, setCatalog] = useState({ courses_or_departments: [] });
  const [form, setForm] = useState({ title: "", course_or_dept_id: "", duration_minutes: 90 });
  const [session, setSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/sessions/catalog").then((response) => {
      setCatalog(response.data);
      if (response.data.courses_or_departments.length) {
        setForm((current) => ({
          ...current,
          course_or_dept_id: current.course_or_dept_id || response.data.courses_or_departments[0].id
        }));
      }
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await api.post("/sessions/create", {
        ...form,
        duration_minutes: Number(form.duration_minutes)
      });
      setSession(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create session.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadQr = () => {
    if (!session?.session_qr_image) {
      return;
    }
    const link = document.createElement("a");
    link.href = session.session_qr_image;
    link.download = `${session.title.replace(/\s+/g, "-").toLowerCase()}-session-qr.png`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div className="eyebrow">Create Session</div>
        <h1 className="section-title">Generate a fresh expiring QR.</h1>
        <p className="section-copy">
          Pick a course or department, choose a duration, and project the session QR for real-time attendance capture.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form className="card bg-gradient-to-br from-white to-slate-50 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div>
              <label className="label">Session Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Data Structures - Lecture 12"
                required
              />
            </div>
            <div>
              <label className="label">Course / Department</label>
              <select
                className="input"
                value={form.course_or_dept_id}
                onChange={(event) => setForm((current) => ({ ...current, course_or_dept_id: event.target.value }))}
                required
              >
                <option value="">Select course or department</option>
                {catalog.courses_or_departments.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} - {course.organization.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <select
                className="input"
                value={form.duration_minutes}
                onChange={(event) => setForm((current) => ({ ...current, duration_minutes: event.target.value }))}
              >
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>
            {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
            <button type="submit" className="btn-primary" disabled={submitting || !catalog.courses_or_departments.length}>
              {submitting ? "Generating QR..." : "Generate Session QR"}
            </button>
            {!catalog.courses_or_departments.length ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No courses or departments are assigned yet. Ask an admin to create one.
              </div>
            ) : null}
          </div>
        </form>

        <div className="space-y-5">
          {session ? (
            <>
              <QRDisplay
                title={session.title}
                subtitle={`${session.course_or_dept_name} - expires at ${new Date(session.expires_at).toLocaleString()}`}
                qrImage={session.session_qr_image}
                expiresAt={session.expires_at}
                footer="Display this session QR on the projector or shared screen."
              />
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={downloadQr}>
                  Download QR
                </button>
                <Link to={`/session/live/${session.id}`} className="btn-primary">
                  Start Live View
                </Link>
              </div>
            </>
          ) : (
            <div className="card flex min-h-[420px] items-center justify-center bg-gradient-to-br from-white to-brand-50/40 p-10 text-center text-slate-500">
              <div className="max-w-sm">
                <div className="text-lg font-semibold text-slate-800">Session QR preview</div>
                <div className="mt-3">
                  Your generated session QR will appear here, ready for download and live monitoring.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSession;
