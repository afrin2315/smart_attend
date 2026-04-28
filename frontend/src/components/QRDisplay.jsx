import { useEffect, useState } from "react";

const formatRemaining = (expiresAt) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return "Expired";
  }
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s remaining`;
};

const QRDisplay = ({ title, subtitle, qrImage, expiresAt, footer, bordered = true }) => {
  const [remaining, setRemaining] = useState(expiresAt ? formatRemaining(expiresAt) : null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return undefined;
    }

    const tick = () => setRemaining(formatRemaining(expiresAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const isExpired = remaining === "Expired";
  const isCritical = remaining && remaining !== "Expired" && new Date(expiresAt).getTime() - Date.now() < 10 * 60 * 1000;

  return (
    <div
      className={`card p-6 text-center ${bordered ? "" : "border-none shadow-none"} ${
        isExpired ? "border-red-300" : isCritical ? "border-amber-300" : ""
      }`}
    >
      <div className="mx-auto flex h-[300px] w-[300px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-4">
        <img src={qrImage} alt={title} className="h-full w-full object-contain" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
      {remaining ? (
        <div className={`mt-4 text-sm font-semibold ${isExpired || isCritical ? "text-red-600" : "text-slate-500"}`}>
          {remaining}
        </div>
      ) : null}
      {footer ? <div className="mt-4 text-sm text-slate-600">{footer}</div> : null}
    </div>
  );
};

export default QRDisplay;
