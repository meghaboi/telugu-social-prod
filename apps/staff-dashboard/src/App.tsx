import { useState } from "react";
import { staffApi } from "./api";

type Report = { id: string; reason: string; status: string };
type EventItem = { id: string; title: string; tier: string };
type UserItem = { id: string; displayName: string | null; username: string | null };

export function App() {
  const [staffUserId, setStaffUserId] = useState("");
  const [staffRole, setStaffRole] = useState("staff_admin");
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState(0);
  const [error, setError] = useState("");

  async function loadReports() {
    try {
      setError("");
      const data = await staffApi<{ reports: Report[] }>("/staff/moderation/reports", staffUserId, staffRole);
      setReports(data.reports);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadQueue() {
    try {
      setError("");
      const data = await staffApi<{ events: EventItem[] }>("/staff/events/review-queue", staffUserId, staffRole);
      setEvents(data.events);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadUsers() {
    try {
      setError("");
      const data = await staffApi<{ users: UserItem[] }>("/staff/users", staffUserId, staffRole);
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadLogs() {
    try {
      setError("");
      const data = await staffApi<{ logs: unknown[] }>("/staff/audit-logs", staffUserId, staffRole);
      setLogs(data.logs.length);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <p className="eyebrow">telugu.social</p>
        <h1>Staff Control</h1>
        <p className="sidebar-copy">Moderation, review queue, user management, and audit visibility.</p>
      </aside>

      <main className="dashboard-main">
        <section className="card">
          <div className="top-row">
            <div>
              <p className="eyebrow">Phase 1</p>
              <h2>Admin Access</h2>
            </div>
            <p className="status-pill">{staffUserId ? "Authorized ID entered" : "Awaiting staff ID"}</p>
          </div>

          <div className="input-grid">
            <label>
              Staff User ID
              <input value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} />
            </label>
            <label>
              Staff Role
              <input value={staffRole} onChange={(e) => setStaffRole(e.target.value)} />
            </label>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Actions</h3>
          <div className="row">
            <button onClick={loadReports} disabled={!staffUserId}>
              Load Reports
            </button>
            <button onClick={loadQueue} disabled={!staffUserId}>
              Load Event Queue
            </button>
            <button onClick={loadUsers} disabled={!staffUserId}>
              Load Users
            </button>
            <button onClick={loadLogs} disabled={!staffUserId}>
              Load Audit Logs
            </button>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="card">
            <h3>Reports</h3>
            <ul className="list">
              {reports.length ? (
                reports.map((report) => (
                  <li key={report.id}>
                    <strong>{report.reason}</strong>
                    <span>Status: {report.status}</span>
                  </li>
                ))
              ) : (
                <li className="empty">No reports loaded yet.</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Event Review Queue</h3>
            <ul className="list">
              {events.length ? (
                events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.title}</strong>
                    <span>Tier: {event.tier}</span>
                  </li>
                ))
              ) : (
                <li className="empty">No queued events loaded yet.</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Users</h3>
            <ul className="list">
              {users.length ? (
                users.map((user) => (
                  <li key={user.id}>
                    <strong>{user.displayName ?? "No name"}</strong>
                    <span>@{user.username ?? "no-username"}</span>
                  </li>
                ))
              ) : (
                <li className="empty">No users loaded yet.</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Audit Logs</h3>
            <p className="audit-count">{logs}</p>
            <p className="audit-copy">entries available in current response.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
