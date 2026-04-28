import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/dashboard";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f3b] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[#1e1b4b] p-10 text-white lg:block">
          <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-100">
              SmartAttend
            </div>
            <h1 className="mt-8 text-5xl font-extrabold leading-tight">
              Secure attendance with every scan.
            </h1>
            <p className="mt-6 max-w-md text-lg text-indigo-100/80">
              Teachers, HR teams, students, and employees all work from the same dual-QR flow, with live monitoring and clean exports built in.
            </p>
            <div className="mt-10 grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                Permanent personal QR for identity.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                Expiring session QR for each lecture or shift.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                JWT-verified scan to stop proxy attendance.
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Welcome Back
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900">Sign in to SmartAttend</h2>
            <p className="mt-3 text-slate-500">
              Use your assigned email and password to continue.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </div>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              New here?{" "}
              <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-800">
                Create an account
              </Link>
            </div>
            <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-center text-sm text-slate-600">
              Account creation is managed by your admin, teacher, or HR team.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
