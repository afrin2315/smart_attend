import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "react-qr-scanner";

import api from "../api/client";

const resultStyles = {
  present: "border-emerald-200 bg-emerald-50 text-emerald-700",
  late: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-red-200 bg-red-50 text-red-700"
};

const Scan = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleScan = async (scanData) => {
    const parsed = scanData?.text || scanData;
    if (!parsed || processing) {
      return;
    }

    setProcessing(true);
    try {
      const response = await api.post("/attendance/scan", { session_qr_code: parsed });
      setResult(response.data);
      if (response.data.status !== "rejected") {
        window.setTimeout(() => navigate("/dashboard"), 3000);
      }
    } catch (err) {
      setResult({
        status: "rejected",
        message: err.response?.data?.detail || "Unable to scan this QR right now."
      });
    } finally {
      window.setTimeout(() => setProcessing(false), 1200);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3">
        <div className="eyebrow">QR Scan</div>
        <h1 className="section-title">Scan the live session QR.</h1>
        <p className="section-copy">
          Keep your camera pointed at the projected session code. Your logged-in identity verifies the second half of the attendance check.
        </p>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
        <div className="card overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-4 sm:p-6">
          <div className="mb-4 text-sm font-medium text-indigo-100/80">
            Align the QR inside the frame. Attendance will submit automatically after a valid scan.
          </div>
          <div className="rounded-[28px] bg-slate-950 p-3 shadow-2xl shadow-black/30">
            <QrScanner
              delay={500}
              style={{ width: "100%", borderRadius: "22px", overflow: "hidden" }}
              onError={() =>
                setResult({ status: "rejected", message: "Camera access failed. Please allow camera permission." })
              }
              onScan={handleScan}
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-slate-900">How it works</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-500">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                1. Your account identity is verified from the JWT session.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                2. The session QR is checked for expiry and active status.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                3. Attendance is marked once per session only.
              </div>
            </div>
          </div>

          {result ? (
            <div className={`card border p-6 shadow-lg ${resultStyles[result.status] || resultStyles.rejected}`}>
              <div className="text-lg font-bold">
                {result.status === "present"
                  ? "Attendance Marked!"
                  : result.status === "late"
                    ? "Marked Late"
                    : "Unable to Mark Attendance"}
              </div>
              <div className="mt-2 text-sm">{result.message}</div>
              {result.marked_at ? (
                <div className="mt-3 text-sm font-semibold">
                  {new Date(result.marked_at).toLocaleTimeString()}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="card p-6 text-sm text-slate-500">
              Your scan result will appear here. Successful scans return you to the dashboard after 3 seconds.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scan;
