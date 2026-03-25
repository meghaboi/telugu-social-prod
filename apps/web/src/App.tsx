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
    <div className="page">
      <h1>telugu.social User App (Phase 1)</h1>
      <p>Use OTP auth, then load Pulse, events and spaces.</p>

      <div className="card">
        <h2>Auth</h2>
        <label>
          Phone
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        </label>
        <div className="row">
          <button onClick={requestOtp}>Request OTP</button>
          <button onClick={verifyOtp}>Verify OTP</button>
        </div>
        <label>
          OTP
          <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
        </label>
        <p>User ID: {userId || "not logged in"}</p>
        {error ? <p className="error">{error}</p> : null}
      </div>

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

      <div className="card">
        <h2>Pulse</h2>
        <p>{pulse || "No pulse loaded"}</p>
      </div>

      <div className="card">
        <h2>Events</h2>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              {event.title} ({event.tier}) - {event.area}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Spaces</h2>
        <ul>
          {spaces.map((space) => (
            <li key={space.id}>
              {space.name} [{space.type}] role={space.role}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

