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
    <div className="page">
      <h1>telugu.social Staff Dashboard (Phase 1)</h1>
      <p>Moderation queue, event tiering queue, user management and audit logs.</p>

      <div className="card">
        <label>
          Staff User ID
          <input value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} />
        </label>
        <label>
          Staff Role
          <input value={staffRole} onChange={(e) => setStaffRole(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
      </div>

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

      <div className="card">
        <h2>Reports</h2>
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              {report.reason} [{report.status}]
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Event Review Queue</h2>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              {event.title} ({event.tier})
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Users</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.displayName ?? "No name"} @{user.username ?? "no-username"}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Audit Logs</h2>
        <p>Total logs: {logs}</p>
      </div>
    </div>
  );
}

