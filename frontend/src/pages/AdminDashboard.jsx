import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAuthToken } from "../api";

const emptyStop = {
    id: null,
    name: "",
    latitude: "",
    longitude: "",
    description: "",
    extendedDescription: "",
    imageUrlsText: "",
    isActive: true,
    sortOrder: 0,
};

const emptySettings = {
    companyName: "",
    unlockRadiusFeet: 20,
    returnLocation: ["", ""],
    closingTime: "19:30",
    reminderLeadMinutes: 20,
    averageBikeSpeedMph: 8,
};

export default function AdminDashboard() {
    const [stops, setStops] = useState([]);
    const [stopForm, setStopForm] = useState(emptyStop);
    const [settings, setSettings] = useState(emptySettings);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("admin_token");

        if (!token) {
            navigate("/admin/login");
            return;
        }

        setAuthToken(token);
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);

            const [stopsRes, settingsRes] = await Promise.all([
                API.get("/api/admin/stops"),
                API.get("/api/admin/settings"),
            ]);

            setStops(stopsRes.data);
            setSettings(settingsRes.data);
        } catch (err) {
            localStorage.removeItem("admin_token");
            setAuthToken(null);
            navigate("/admin/login");
        } finally {
            setLoading(false);
        }
    }

    function beginEdit(stop) {
        setStopForm({
            id: stop.id,
            name: stop.name,
            latitude: stop.position[0],
            longitude: stop.position[1],
            description: stop.description,
            extendedDescription: stop.extendedDescription,
            imageUrlsText: (stop.imageUrls || []).join("\n"),
            isActive: stop.isActive,
            sortOrder: stop.sortOrder,
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function saveStop(e) {
        e.preventDefault();
        setMessage("");

        const payload = {
            name: stopForm.name.trim(),
            latitude: Number(stopForm.latitude),
            longitude: Number(stopForm.longitude),
            description: stopForm.description.trim(),
            extendedDescription: stopForm.extendedDescription.trim(),
            imageUrls: stopForm.imageUrlsText
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            isActive: stopForm.isActive,
            sortOrder: Number(stopForm.sortOrder),
        };

        try {
            if (stopForm.id) {
                await API.put(`/api/admin/stops/${stopForm.id}`, payload);
                setMessage("Stop updated.");
            } else {
                await API.post("/api/admin/stops", payload);
                setMessage("Stop created.");
            }

            setStopForm(emptyStop);
            loadData();
        } catch (err) {
            setMessage(err.response?.data?.message || "Could not save stop.");
        }
    }

    async function deleteStop(id) {
        if (!window.confirm("Delete this stop?")) return;

        try {
            await API.delete(`/api/admin/stops/${id}`);
            setMessage("Stop deleted.");
            loadData();
        } catch (err) {
            setMessage(err.response?.data?.message || "Could not delete stop.");
        }
    }

    async function saveSettings(e) {
        e.preventDefault();
        setMessage("");

        try {
            await API.put("/api/admin/settings", {
                companyName: settings.companyName,
                unlockRadiusFeet: Number(settings.unlockRadiusFeet),
                returnLocation: [
                    Number(settings.returnLocation[0]),
                    Number(settings.returnLocation[1]),
                ],
                closingTime: settings.closingTime,
                reminderLeadMinutes: Number(settings.reminderLeadMinutes),
                averageBikeSpeedMph: Number(settings.averageBikeSpeedMph),
            });

            setMessage("Settings updated.");
            loadData();
        } catch (err) {
            setMessage(err.response?.data?.message || "Could not save settings.");
        }
    }

    function logout() {
        localStorage.removeItem("admin_token");
        setAuthToken(null);
        navigate("/admin/login");
    }

    if (loading) {
        return <div className="center-screen">Loading admin dashboard...</div>;
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <div>
                    <h1>Admin Dashboard</h1>
                    <p className="muted-text">
                        Manage stops, hours, reminders, and return location.
                    </p>
                </div>

                <button className="secondary-button" onClick={logout} type="button">
                    Log Out
                </button>
            </div>

            {message && <p className="success-text admin-message">{message}</p>}

            <div className="admin-grid">
                <div className="card">
                    <h2>{stopForm.id ? "Edit Stop" : "Add Stop"}</h2>

                    <form onSubmit={saveStop} className="stack">
                        <input
                            className="input"
                            placeholder="Stop name"
                            value={stopForm.name}
                            onChange={(e) =>
                                setStopForm((prev) => ({ ...prev, name: e.target.value }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Latitude"
                            value={stopForm.latitude}
                            onChange={(e) =>
                                setStopForm((prev) => ({ ...prev, latitude: e.target.value }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Longitude"
                            value={stopForm.longitude}
                            onChange={(e) =>
                                setStopForm((prev) => ({ ...prev, longitude: e.target.value }))
                            }
                        />

                        <textarea
                            className="input textarea"
                            placeholder="Short description"
                            value={stopForm.description}
                            onChange={(e) =>
                                setStopForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                        />

                        <textarea
                            className="input textarea"
                            placeholder="Extended story"
                            value={stopForm.extendedDescription}
                            onChange={(e) =>
                                setStopForm((prev) => ({
                                    ...prev,
                                    extendedDescription: e.target.value,
                                }))
                            }
                        />

                        <textarea
                            className="input textarea"
                            placeholder="Image URLs, one per line"
                            value={stopForm.imageUrlsText}
                            onChange={(e) =>
                                setStopForm((prev) => ({
                                    ...prev,
                                    imageUrlsText: e.target.value,
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Sort order"
                            value={stopForm.sortOrder}
                            onChange={(e) =>
                                setStopForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                            }
                        />

                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={stopForm.isActive}
                                onChange={(e) =>
                                    setStopForm((prev) => ({
                                        ...prev,
                                        isActive: e.target.checked,
                                    }))
                                }
                            />
                            Active stop
                        </label>

                        <div className="row gap wrap">
                            <button className="primary-button" type="submit">
                                Save Stop
                            </button>

                            <button
                                className="secondary-button"
                                type="button"
                                onClick={() => setStopForm(emptyStop)}
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card">
                    <h2>Business Settings</h2>

                    <form onSubmit={saveSettings} className="stack">
                        <input
                            className="input"
                            placeholder="Company name"
                            value={settings.companyName}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    companyName: e.target.value,
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Unlock radius in feet"
                            value={settings.unlockRadiusFeet}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    unlockRadiusFeet: e.target.value,
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Return latitude"
                            value={settings.returnLocation[0]}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    returnLocation: [e.target.value, prev.returnLocation[1]],
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Return longitude"
                            value={settings.returnLocation[1]}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    returnLocation: [prev.returnLocation[0], e.target.value],
                                }))
                            }
                        />

                        <input
                            className="input"
                            type="time"
                            value={settings.closingTime}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    closingTime: e.target.value,
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Reminder lead minutes"
                            value={settings.reminderLeadMinutes}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    reminderLeadMinutes: e.target.value,
                                }))
                            }
                        />

                        <input
                            className="input"
                            placeholder="Average bike speed (mph)"
                            value={settings.averageBikeSpeedMph}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    averageBikeSpeedMph: e.target.value,
                                }))
                            }
                        />

                        <button className="primary-button" type="submit">
                            Save Settings
                        </button>
                    </form>
                </div>
            </div>

            <div className="card">
                <h2>Existing Stops</h2>

                <div className="admin-stop-list">
                    {stops.map((stop) => (
                        <div key={stop.id} className="admin-stop-row">
                            <div className="admin-stop-info">
                                <strong>{stop.name}</strong>
                                <div className="muted-text">{stop.description}</div>
                            </div>

                            <div className="row gap wrap">
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => beginEdit(stop)}
                                >
                                    Edit
                                </button>

                                <button
                                    className="danger-button"
                                    type="button"
                                    onClick={() => deleteStop(stop.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}