import { NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const navConfig = {
  admin: [
    { to: "/dashboard", label: "Overview" },
    { to: "/reports", label: "Reports" },
    { to: "/profile", label: "Profile" }
  ],
  teacher: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/session/create", label: "Create Session" },
    { to: "/reports", label: "Reports" },
    { to: "/profile", label: "Profile" }
  ],
  hr: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/session/create", label: "Create Session" },
    { to: "/reports", label: "Reports" },
    { to: "/profile", label: "Profile" }
  ],
  student: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/scan", label: "Scan QR" },
    { to: "/reports", label: "Reports" },
    { to: "/profile", label: "Profile" }
  ],
  employee: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/scan", label: "Scan QR" },
    { to: "/reports", label: "Reports" },
    { to: "/profile", label: "Profile" }
  ]
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const links = navConfig[user?.role] || [];

  return (
    <aside className="relative flex w-full flex-col overflow-hidden bg-[#1e1b4b] px-5 py-6 text-white lg:min-h-screen lg:w-72 lg:px-6 lg:py-8">
      <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-brand-500/15 blur-3xl" />

      <div className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 shadow-2xl shadow-black/10">
        <div className="text-2xl font-extrabold tracking-tight">SmartAttend</div>
        <p className="mt-2 text-sm text-indigo-100/80">
          Dual-QR attendance for secure classrooms and workplaces.
        </p>
      </div>

      <nav className="relative mt-8 grid gap-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-[#1e1b4b] shadow-lg shadow-black/10"
                  : "text-indigo-100/80 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm lg:mt-auto">
        <div className="text-sm font-semibold">{user?.name}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-indigo-100/70">
          {user?.role}
        </div>
        <div className="mt-1 text-sm text-indigo-100/80">{user?.email}</div>
        <button
          type="button"
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
