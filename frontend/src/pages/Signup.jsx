import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "hr", label: "HR" }
];

const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    org_type: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (value) => {
    if (value === "teacher") {
      setForm((current) => ({ ...current, role: value, org_type: "college" }));
      return;
    }
    if (value === "hr") {
      setForm((current) => ({ ...current, role: value, org_type: "industry" }));
      return;
    }
    setForm((current) => ({ ...current, role: value, org_type: current.role === "admin" ? current.org_type : "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f3b] px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-2xl lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-[#1e1b4b] p-10 text-white lg:block">
          <div className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-100">
              SmartAttend
            </div>
            <h1 className="mt-8 text-5xl font-extrabold leading-tight">
              Create your SmartAttend account.
            </h1>
            <p className="mt-6 max-w-md text-lg text-indigo-100/80">
              Sign up directly if you are joining SmartAttend as an admin, teacher, or HR manager.
            </p>
            <div className="mt-10 grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                Admin accounts manage organizations and system setup.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                Teacher accounts create student-facing attendance sessions.
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                HR accounts onboard employees and manage workplace attendance.
              </div>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Create Account
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-slate-900">Register as staff</h2>
            <p className="mt-3 text-slate-500">
              This signup page is for admin, teacher, and HR accounts. Students and employees should be created from inside the app by staff.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>
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
                  minLength={8}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Role</label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(event) => handleRoleChange(event.target.value)}
                    required
                  >
                    <option value="">Select an option</option>
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Organization Type</label>
                  <select
                    className="input"
                    value={form.org_type}
                    onChange={(event) => setForm((current) => ({ ...current, org_type: event.target.value }))}
                    disabled={form.role === "teacher" || form.role === "hr" || !form.role}
                    required
                  >
                    <option value="">Select an option</option>
                    <option value="college">College</option>
                    <option value="industry">Industry</option>
                  </select>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Signup;
