import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api, { downloadFile, getWsBaseUrl } from "../api/client";
import AttendanceTable from "../components/AttendanceTable";
import QRDisplay from "../components/QRDisplay";
import StatsCard from "../components/StatsCard";

const LiveSession = () => {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    const [sessionRes, attendanceRes] = await Promise.all([
      api.get(`/sessions/${id}`),
      api.get(`/sessions/${id}/attendance`)
    ]);
    setSession(sessionRes.data);
    setRecords(attendanceRes.data);
  };

  useEffect(() => {
    let socket;
    loadSession()
      .finally(() => setLoading(false))
      .then(() => {
        socket = new WebSocket(`${getWsBaseUrl()}/sessions/${id}/live`);
        socket.onopen = () => socket.send("subscribe");
        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          if (payload.type !== "attendance_marked") {
            return;
          }
          setRecords((current) => {
            if (current.some((record) => record.id === payload.record.id)) {
              return current;
            }
            return [payload.record, ...current];
          });
          setSession((current) => (current ? { ...current, ...payload.session } : current));
        };
      });

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [id]);

  const closeSession = async () => {
    await api.patch(`/sessions/${id}/close`);
    await loadSession();
  };

  if (loading) {
    return <div className="text-slate-500">Loading live session...</div>;
  }

  if (!session) {
    return <div className="text-slate-500">Session not found.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div className="eyebrow">Live Session</div>
        <h1 className="section-title">{session.title}</h1>
        <p className="section-copy">
          {session.course_or_dept_name} - Created by {session.created_by_name}
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <StatsCard label="Marked" value={records.length} />
        <StatsCard label="Expected" value={session.target_count} accent="emerald" />
        <StatsCard
          label="Attendance Progress"
          value={`${session.target_count ? Math.round((records.length / session.target_count) * 100) : 0}%`}
          accent="amber"
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        <QRDisplay
          title={session.title}
          subtitle={`${session.course_or_dept_name} - ${session.organization_name}`}
          qrImage={session.session_qr_image}
          expiresAt={session.expires_at}
          footer={`Started at ${new Date(session.started_at).toLocaleString()}`}
        />

        <div className="space-y-5">
          <div className="card bg-gradient-to-br from-white to-slate-50 p-6">
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-danger" onClick={closeSession}>
                Close Session
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => downloadFile(`/reports/session/${session.id}/csv`, `session-${session.id}.csv`)}
              >
                Export CSV
              </button>
            </div>
            <div className="mt-5 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Live counter: {records.length} / {session.target_count} students marked
            </div>
          </div>
          <AttendanceTable rows={records} />
        </div>
      </section>
    </div>
  );
};

export default LiveSession;
