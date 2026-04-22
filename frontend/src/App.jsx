import { Routes, Route, Link } from "react-router-dom";
import RiderApp from "./pages/RiderApp";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RiderApp />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route
        path="*"
        element={
          <div className="center-screen">
            <div className="card">
              <h1>Page not found</h1>
              <Link to="/">Go back</Link>
            </div>
          </div>
        }
      />
    </Routes>
  );
}