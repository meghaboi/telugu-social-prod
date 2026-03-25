import { useState } from "react";
import { api } from "./api";

type BasicEvent = { id: string; title: string; tier: string; area: string; startAt: string };
type Space = { id: string; name: string; type: string; role: string };

export function App() {
  const [userId, setUserId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("9000000002");
  const [otpCode, setOtpCode] = useState("");
  const [events, setEvents] = useState<BasicEvent[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pulse, setPulse] = useState<string>("");
  const [error, setError] = useState("");

  async function requestOtp() {
    setError("");
    const data = await api<{ devCode?: string }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phoneNumber, purpose: "LOGIN" })
    });
    setOtpCode(data.devCode ?? "");
  }

  async function verifyOtp() {
    setError("");
    try {
      const data = await api<{ userId: string }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phoneNumber, code: otpCode, purpose: "LOGIN" })
      });
      setUserId(data.userId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadPulse() {
    const data = await api<{ groups: { friends: BasicEvent[]; interests: BasicEvent[]; spacesOrPromoted: BasicEvent[] } }>(
      "/pulse",
      { userId }
    );
    setPulse(
      `friends:${data.groups.friends.length} interests:${data.groups.interests.length} spaces/promoted:${data.groups.spacesOrPromoted.length}`
    );
  }

  async function loadEvents() {
    const data = await api<{ events: BasicEvent[] }>("/events", { userId });
    setEvents(data.events);
  }

  async function loadSpaces() {
    const data = await api<{ spaces: Space[] }>("/spaces", { userId });
    setSpaces(data.spaces);
  }

  return (
    <div className="app-shell">
      <aside className="left-rail">
        <p className="eyebrow">telugu.social</p>
        <h1>Community App</h1>
        <p className="subtitle">A modern shell for Pulse, events, and spaces.</p>
        <nav className="rail-nav">
          <button className="ghost-btn" type="button">
            Pulse
          </button>
          <button className="ghost-btn" type="button">
            Events
          </button>
          <button className="ghost-btn" type="button">
            Spaces
          </button>
        </nav>
      </aside>

      <main className="main-panel">
        <section className="card hero-card">
          <div>
            <p className="eyebrow">Phase 1 Web</p>
            <h2>Sign in and load live data</h2>
          </div>
          <p className="status-pill">{userId ? "Logged in" : "Logged out"}</p>
        </section>

        <section className="card">
          <h3>Authentication</h3>
          <div className="field-grid">
            <label>
              Phone
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
            </label>
            <label>
              OTP
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button onClick={requestOtp}>Request OTP</button>
            <button onClick={verifyOtp}>Verify OTP</button>
          </div>
          <p className="meta-line">User ID: {userId || "not logged in"}</p>
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="card">
          <h3>Data Actions</h3>
          <div className="row">
            <button disabled={!userId} onClick={loadPulse}>
              Load Pulse
            </button>
            <button disabled={!userId} onClick={loadEvents}>
              Load Events
            </button>
            <button disabled={!userId} onClick={loadSpaces}>
              Load Spaces
            </button>
          </div>
        </section>

        <section className="grid-panels">
          <article className="card">
            <h3>Pulse</h3>
            <p className="body-copy">{pulse || "No pulse loaded yet."}</p>
          </article>

          <article className="card">
            <h3>Events</h3>
            <ul className="list">
              {events.length ? (
                events.map((event) => (
                  <li key={event.id}>
                    <strong>{event.title}</strong>
                    <span>
                      {event.tier} | {event.area}
                    </span>
                  </li>
                ))
              ) : (
                <li className="empty">No events loaded yet.</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h3>Spaces</h3>
            <ul className="list">
              {spaces.length ? (
                spaces.map((space) => (
                  <li key={space.id}>
                    <strong>{space.name}</strong>
                    <span>
                      {space.type} | role: {space.role}
                    </span>
                  </li>
                ))
              ) : (
                <li className="empty">No spaces loaded yet.</li>
              )}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
