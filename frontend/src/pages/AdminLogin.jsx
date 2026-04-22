import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAuthToken } from "../api";

export default function AdminLogin() {
    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const res = await API.post("/api/admin/login", form);
            const token = res.data.access_token;

            localStorage.setItem("admin_token", token);
            setAuthToken(token);

            navigate("/admin");
        } catch (err) {
            setMessage(err.response?.data?.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="center-screen">
            <div className="card admin-auth-card">
                <h1>Admin Login</h1>
                <p className="muted-text">Company access for stops and settings.</p>

                <form onSubmit={handleSubmit} className="stack">
                    <input
                        className="input"
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                    />

                    <input
                        className="input"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) =>
                            setForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                    />

                    <button className="primary-button" type="submit" disabled={loading}>
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                {message && <p className="error-text">{message}</p>}
            </div>
        </div>
    );
}