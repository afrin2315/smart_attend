import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import CreateSession from "./pages/CreateSession";
import Dashboard from "./pages/Dashboard";
import LiveSession from "./pages/LiveSession";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Scan from "./pages/Scan";
import Signup from "./pages/Signup";

const AppLayout = () => (
  <div className="min-h-screen bg-slate-100 lg:flex">
    <Sidebar />
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <Outlet />
      </div>
    </main>
  </div>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/reports" element={<Reports />} />
        <Route element={<ProtectedRoute roles={["student", "employee"]} />}>
          <Route path="/scan" element={<Scan />} />
        </Route>
        <Route element={<ProtectedRoute roles={["teacher", "hr"]} />}>
          <Route path="/session/create" element={<CreateSession />} />
          <Route path="/session/live/:id" element={<LiveSession />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
