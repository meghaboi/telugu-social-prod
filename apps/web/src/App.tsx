import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

type AppRoute =
  | "/"
  | "/login"
  | "/otp"
  | "/onboarding/profile"
  | "/onboarding/interests"
  | "/onboarding/location"
  | "/onboarding/terms"
  | "/app/pulse"
  | "/app/events"
  | "/app/spaces"
  | "/app/chat"
  | "/app/profile";

type SessionState = {
  userId: string;
  phoneNumber: string;
  onboardingCompleted: boolean;
};

type School = { id: string; name: string; area: string };
type Neighbourhood = { id: string; name: string; city: string };
type Interest = { id: string; slug: string; label: string };

type PulseEvent = {
  id: string;
  title: string;
  tier: string;
  area: string;
  startAt: string;
};

type PulseData = {
  groups: {
    friends: PulseEvent[];
    interests: PulseEvent[];
    spacesOrPromoted: PulseEvent[];
  };
  totalEntries: number;
};

type ProfileDraft = {
  displayName: string;
  username: string;
  schoolId: string;
  neighbourhoodId: string;
};

const SESSION_KEY = "telugu.session";
const PENDING_PHONE_KEY = "telugu.pending_phone";
const ONBOARDING_ROUTES: AppRoute[] = [
  "/onboarding/profile",
  "/onboarding/interests",
  "/onboarding/location",
  "/onboarding/terms"
];
const APP_ROUTES: AppRoute[] = ["/app/pulse", "/app/events", "/app/spaces", "/app/chat", "/app/profile"];

function isAppRoute(path: AppRoute): boolean {
  return APP_ROUTES.includes(path);
}

function isOnboardingRoute(path: AppRoute): boolean {
  return ONBOARDING_ROUTES.includes(path);
}

function normalizePath(path: string): AppRoute {
  const clean = path.replace(/\/+$/, "") || "/";
  const known: AppRoute[] = ["/", "/login", "/otp", ...ONBOARDING_ROUTES, ...APP_ROUTES];
  return known.includes(clean as AppRoute) ? (clean as AppRoute) : "/";
}

function readSession(): SessionState | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessionState;
    if (!parsed.userId || !parsed.phoneNumber) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: SessionState | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readPendingPhone(): string {
  return localStorage.getItem(PENDING_PHONE_KEY) ?? "";
}

function writePendingPhone(phone: string): void {
  if (!phone) {
    localStorage.removeItem(PENDING_PHONE_KEY);
    return;
  }
  localStorage.setItem(PENDING_PHONE_KEY, phone);
}

function toDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function routeWithGuard(route: AppRoute, session: SessionState | null): AppRoute {
  if (!session) {
    if (isAppRoute(route) || isOnboardingRoute(route)) {
      return "/login";
    }
    return route;
  }

  if (session.onboardingCompleted) {
    if (route === "/" || route === "/login" || route === "/otp" || isOnboardingRoute(route)) {
      return "/app/pulse";
    }
    return route;
  }

  if (isAppRoute(route) || route === "/" || route === "/login" || route === "/otp") {
    return "/onboarding/profile";
  }

  return route;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizePath(window.location.pathname));
  const [session, setSession] = useState<SessionState | null>(() => readSession());
  const [pendingPhone, setPendingPhone] = useState<string>(() => readPendingPhone());
  const [globalError, setGlobalError] = useState("");

  const [phoneInput, setPhoneInput] = useState(() => readPendingPhone() || "9000000002");
  const [otpInput, setOtpInput] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(30);
  const [authLoading, setAuthLoading] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [neighbourhoods, setNeighbourhoods] = useState<Neighbourhood[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  const [profile, setProfile] = useState<ProfileDraft>({
    displayName: "",
    username: "",
    schoolId: "",
    neighbourhoodId: ""
  });
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);

  function navigate(path: AppRoute, options?: { replace?: boolean }) {
    const guarded = routeWithGuard(path, session);
    const method = options?.replace ? "replaceState" : "pushState";
    window.history[method](null, "", guarded);
    setRoute(guarded);
  }

  function updateSession(next: SessionState | null) {
    setSession(next);
    writeSession(next);
  }

  function setNextPendingPhone(phone: string) {
    setPendingPhone(phone);
    writePendingPhone(phone);
  }

  useEffect(() => {
    const onPop = () => {
      const next = routeWithGuard(normalizePath(window.location.pathname), session);
      if (next !== window.location.pathname) {
        window.history.replaceState(null, "", next);
      }
      setRoute(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [session]);

  useEffect(() => {
    const guarded = routeWithGuard(route, session);
    if (guarded !== route) {
      window.history.replaceState(null, "", guarded);
      setRoute(guarded);
    }
  }, [route, session]);

  useEffect(() => {
    if (route !== "/otp") {
      return;
    }
    if (otpTimer <= 0) {
      return;
    }
    const t = window.setInterval(() => {
      setOtpTimer((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [otpTimer, route]);

  useEffect(() => {
    if (!session || !isOnboardingRoute(route)) {
      return;
    }
    if (schools.length && neighbourhoods.length && interests.length) {
      return;
    }

    setMetaLoading(true);
    setGlobalError("");
    Promise.all([
      api<{ schools: School[] }>("/meta/schools"),
      api<{ neighbourhoods: Neighbourhood[] }>("/meta/neighbourhoods"),
      api<{ interests: Interest[] }>("/meta/interests")
    ])
      .then(([schoolsResp, neighbourhoodsResp, interestsResp]) => {
        setSchools(schoolsResp.schools);
        setNeighbourhoods(neighbourhoodsResp.neighbourhoods);
        setInterests(interestsResp.interests);
      })
      .catch((error) => {
        setGlobalError((error as Error).message || "Failed to load onboarding metadata");
      })
      .finally(() => {
        setMetaLoading(false);
      });
  }, [session, route, schools.length, neighbourhoods.length, interests.length]);

  useEffect(() => {
    if (!session || route !== "/app/pulse") {
      return;
    }

    setPulseLoading(true);
    setGlobalError("");
    api<PulseData>("/pulse", { userId: session.userId })
      .then((data) => {
        setPulse(data);
      })
      .catch((error) => {
        const message = (error as Error).message;
        if (message.includes("x-user-id")) {
          updateSession(null);
          navigate("/login", { replace: true });
          setGlobalError("Session expired. Please log in again.");
          return;
        }
        setGlobalError(message || "Failed to load pulse");
      })
      .finally(() => {
        setPulseLoading(false);
      });
  }, [route, session]);

  async function requestOtp() {
    const phone = toDigits(phoneInput);
    if (phone.length !== 10) {
      setGlobalError("Enter a valid 10-digit phone number.");
      return;
    }

    setAuthLoading(true);
    setGlobalError("");
    try {
      const data = await api<{ devCode?: string }>("/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: phone, purpose: "LOGIN" })
      });
      setDevOtp(data.devCode ?? "");
      setOtpInput("");
      setOtpTimer(30);
      setNextPendingPhone(phone);
      navigate("/otp");
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to request OTP");
    } finally {
      setAuthLoading(false);
    }
  }

  async function resendOtp() {
    if (!pendingPhone || otpTimer > 0) {
      return;
    }

    setAuthLoading(true);
    setGlobalError("");
    try {
      const data = await api<{ devCode?: string }>("/auth/otp/resend", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: pendingPhone, purpose: "LOGIN" })
      });
      setDevOtp(data.devCode ?? "");
      setOtpTimer(30);
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to resend OTP");
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyOtp() {
    const code = toDigits(otpInput);
    if (!pendingPhone) {
      setGlobalError("Phone session missing. Start again from login.");
      navigate("/login", { replace: true });
      return;
    }
    if (code.length !== 6) {
      setGlobalError("Enter the 6-digit OTP.");
      return;
    }

    setAuthLoading(true);
    setGlobalError("");
    try {
      const data = await api<{ userId: string | null; onboardingCompleted: boolean }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: pendingPhone, code, purpose: "LOGIN" })
      });
      if (!data.userId) {
        throw new Error("Login failed. Please try again.");
      }
      const nextSession: SessionState = {
        userId: data.userId,
        phoneNumber: pendingPhone,
        onboardingCompleted: data.onboardingCompleted
      };
      updateSession(nextSession);
      setNextPendingPhone("");
      setAcceptTerms(false);
      navigate(nextSession.onboardingCompleted ? "/app/pulse" : "/onboarding/profile", { replace: true });
    } catch (error) {
      setGlobalError((error as Error).message || "OTP verification failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function saveProfileAndContinue() {
    if (!session) {
      return;
    }

    const displayName = profile.displayName.trim();
    const username = profile.username.trim();
    if (displayName.length < 2) {
      setGlobalError("Display name must be at least 2 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      setGlobalError("Username must be 3-30 chars and contain letters, digits, _ or .");
      return;
    }
    if (!profile.neighbourhoodId) {
      setGlobalError("Please choose your neighbourhood.");
      return;
    }

    setOnboardingLoading(true);
    setGlobalError("");
    try {
      await api("/onboarding/profile", {
        method: "POST",
        userId: session.userId,
        body: JSON.stringify({
          displayName,
          username,
          schoolId: profile.schoolId || null,
          neighbourhoodId: profile.neighbourhoodId
        })
      });
      navigate("/onboarding/interests");
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to save profile");
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function saveInterestsAndContinue() {
    if (!session) {
      return;
    }
    if (selectedInterestIds.length !== 5) {
      setGlobalError("Select exactly 5 interests to continue.");
      return;
    }

    setOnboardingLoading(true);
    setGlobalError("");
    try {
      await api("/onboarding/interests", {
        method: "POST",
        userId: session.userId,
        body: JSON.stringify({ interestIds: selectedInterestIds })
      });
      navigate("/onboarding/location");
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to save interests");
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function saveLocationAndContinue() {
    if (!session) {
      return;
    }
    if (!profile.neighbourhoodId) {
      setGlobalError("Please choose your neighbourhood.");
      return;
    }

    setOnboardingLoading(true);
    setGlobalError("");
    try {
      await api("/onboarding/profile", {
        method: "POST",
        userId: session.userId,
        body: JSON.stringify({
          displayName: profile.displayName.trim(),
          username: profile.username.trim(),
          schoolId: profile.schoolId || null,
          neighbourhoodId: profile.neighbourhoodId
        })
      });
      navigate("/onboarding/terms");
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to update location");
    } finally {
      setOnboardingLoading(false);
    }
  }

  async function completeOnboarding() {
    if (!session) {
      return;
    }
    if (!acceptTerms) {
      setGlobalError("Accept terms and privacy policy to continue.");
      return;
    }
    if (selectedInterestIds.length !== 5) {
      setGlobalError("Interest selection is missing. Go back and choose exactly 5.");
      return;
    }

    setOnboardingLoading(true);
    setGlobalError("");
    try {
      await api("/onboarding/complete", {
        method: "POST",
        userId: session.userId,
        body: JSON.stringify({ interestIds: selectedInterestIds })
      });
      const updated: SessionState = { ...session, onboardingCompleted: true };
      updateSession(updated);
      navigate("/app/pulse", { replace: true });
    } catch (error) {
      setGlobalError((error as Error).message || "Unable to complete onboarding");
    } finally {
      setOnboardingLoading(false);
    }
  }

  function logout() {
    updateSession(null);
    setNextPendingPhone("");
    setOtpInput("");
    setDevOtp("");
    setPulse(null);
    setProfile({ displayName: "", username: "", schoolId: "", neighbourhoodId: "" });
    setSelectedInterestIds([]);
    setAcceptTerms(false);
    navigate("/login", { replace: true });
  }

  const onboardingProgress = useMemo(() => {
    if (!isOnboardingRoute(route)) {
      return 0;
    }
    return ONBOARDING_ROUTES.indexOf(route) + 1;
  }, [route]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">telugu.social</p>
          <h1>Production UI Flow</h1>
        </div>
        {session ? (
          <div className="top-actions">
            <p className="meta">User: {session.userId.slice(0, 8)}...</p>
            <button type="button" className="ghost" onClick={logout}>
              Logout
            </button>
          </div>
        ) : null}
      </header>

      {globalError ? <p className="error-banner">{globalError}</p> : null}

      {(route === "/" || route === "/login") && (
        <main className="card stack-lg">
          <h2>Login</h2>
          <p className="muted">Enter your phone number to receive OTP.</p>
          <label>
            Phone Number
            <input
              value={phoneInput}
              maxLength={10}
              inputMode="numeric"
              onChange={(event) => setPhoneInput(toDigits(event.target.value))}
              placeholder="10-digit number"
            />
          </label>
          <button type="button" disabled={authLoading} onClick={requestOtp}>
            {authLoading ? "Sending..." : "Request OTP"}
          </button>
        </main>
      )}

      {route === "/otp" && (
        <main className="card stack-lg">
          <h2>OTP Verification</h2>
          <p className="muted">Code sent to {pendingPhone || "your phone"}. Valid for 5 minutes.</p>
          <label>
            OTP Code
            <input
              value={otpInput}
              maxLength={6}
              inputMode="numeric"
              onChange={(event) => setOtpInput(toDigits(event.target.value))}
              placeholder="6-digit code"
            />
          </label>
          {devOtp ? <p className="dev-hint">Dev OTP: {devOtp}</p> : null}
          <div className="row">
            <button type="button" disabled={authLoading} onClick={verifyOtp}>
              {authLoading ? "Verifying..." : "Verify OTP"}
            </button>
            <button type="button" className="ghost" disabled={authLoading || otpTimer > 0} onClick={resendOtp}>
              {otpTimer > 0 ? `Resend in ${formatCountdown(otpTimer)}` : "Resend OTP"}
            </button>
          </div>
          <button type="button" className="text-btn" onClick={() => navigate("/login")}>Back to login</button>
        </main>
      )}

      {isOnboardingRoute(route) && (
        <main className="card stack-lg">
          <div className="row between center">
            <h2>Onboarding</h2>
            <p className="meta">Step {onboardingProgress} / 4</p>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${(onboardingProgress / 4) * 100}%` }} />
          </div>

          {metaLoading ? <p className="muted">Loading options...</p> : null}

          {route === "/onboarding/profile" && (
            <div className="stack-md">
              <label>
                Display Name
                <input
                  value={profile.displayName}
                  onChange={(event) => setProfile((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </label>
              <label>
                Username
                <input
                  value={profile.username}
                  onChange={(event) => setProfile((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))}
                />
              </label>
              <label>
                School (Optional)
                <select
                  value={profile.schoolId}
                  onChange={(event) => setProfile((prev) => ({ ...prev, schoolId: event.target.value }))}
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.area})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Neighbourhood
                <select
                  value={profile.neighbourhoodId}
                  onChange={(event) => setProfile((prev) => ({ ...prev, neighbourhoodId: event.target.value }))}
                >
                  <option value="">Select neighbourhood</option>
                  {neighbourhoods.map((neighbourhood) => (
                    <option key={neighbourhood.id} value={neighbourhood.id}>
                      {neighbourhood.name}, {neighbourhood.city}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" disabled={onboardingLoading || metaLoading} onClick={saveProfileAndContinue}>
                {onboardingLoading ? "Saving..." : "Continue"}
              </button>
            </div>
          )}

          {route === "/onboarding/interests" && (
            <div className="stack-md">
              <p className="muted">Select exactly 5 interests.</p>
              <div className="chip-grid">
                {interests.map((interest) => {
                  const active = selectedInterestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      className={`chip ${active ? "chip-active" : ""}`}
                      onClick={() => {
                        setSelectedInterestIds((prev) => {
                          if (prev.includes(interest.id)) {
                            return prev.filter((id) => id !== interest.id);
                          }
                          if (prev.length >= 5) {
                            return prev;
                          }
                          return [...prev, interest.id];
                        });
                      }}
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
              <p className="meta">Selected: {selectedInterestIds.length}/5</p>
              <div className="row">
                <button type="button" className="ghost" onClick={() => navigate("/onboarding/profile")}>Back</button>
                <button type="button" disabled={onboardingLoading || metaLoading} onClick={saveInterestsAndContinue}>
                  {onboardingLoading ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          {route === "/onboarding/location" && (
            <div className="stack-md">
              <p className="muted">Confirm your locality details before finishing setup.</p>
              <label>
                School (Optional)
                <select
                  value={profile.schoolId}
                  onChange={(event) => setProfile((prev) => ({ ...prev, schoolId: event.target.value }))}
                >
                  <option value="">Select school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.area})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Neighbourhood
                <select
                  value={profile.neighbourhoodId}
                  onChange={(event) => setProfile((prev) => ({ ...prev, neighbourhoodId: event.target.value }))}
                >
                  <option value="">Select neighbourhood</option>
                  {neighbourhoods.map((neighbourhood) => (
                    <option key={neighbourhood.id} value={neighbourhood.id}>
                      {neighbourhood.name}, {neighbourhood.city}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row">
                <button type="button" className="ghost" onClick={() => navigate("/onboarding/interests")}>Back</button>
                <button type="button" disabled={onboardingLoading || metaLoading} onClick={saveLocationAndContinue}>
                  {onboardingLoading ? "Saving..." : "Continue"}
                </button>
              </div>
            </div>
          )}

          {route === "/onboarding/terms" && (
            <div className="stack-md">
              <p className="muted">
                By continuing, you agree to the community terms, moderation policy, and privacy commitments.
              </p>
              <label className="row start center">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                />
                I accept the Terms and Privacy Policy
              </label>
              <div className="row">
                <button type="button" className="ghost" onClick={() => navigate("/onboarding/location")}>Back</button>
                <button type="button" disabled={onboardingLoading} onClick={completeOnboarding}>
                  {onboardingLoading ? "Finishing..." : "Finish Onboarding"}
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {isAppRoute(route) && (
        <main className="stack-lg">
          <nav className="app-nav card row wrap">
            {APP_ROUTES.map((appRoute) => (
              <button
                key={appRoute}
                type="button"
                className={route === appRoute ? "tab-active" : "ghost"}
                onClick={() => navigate(appRoute)}
              >
                {appRoute.replace("/app/", "").toUpperCase()}
              </button>
            ))}
          </nav>

          {route === "/app/pulse" && (
            <section className="card stack-md">
              <h2>Pulse</h2>
              {pulseLoading ? <p className="muted">Loading pulse feed...</p> : null}
              {!pulseLoading && pulse ? (
                <div className="stack-md">
                  <p className="meta">Total entries: {pulse.totalEntries}</p>
                  <div className="pulse-grid">
                    <article className="card inset">
                      <h3>Friends</h3>
                      <ul>
                        {pulse.groups.friends.map((event) => (
                          <li key={event.id}>{event.title}</li>
                        ))}
                      </ul>
                    </article>
                    <article className="card inset">
                      <h3>Interests</h3>
                      <ul>
                        {pulse.groups.interests.map((event) => (
                          <li key={event.id}>{event.title}</li>
                        ))}
                      </ul>
                    </article>
                    <article className="card inset">
                      <h3>Spaces/Promoted</h3>
                      <ul>
                        {pulse.groups.spacesOrPromoted.map((event) => (
                          <li key={event.id}>{event.title}</li>
                        ))}
                      </ul>
                    </article>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {route !== "/app/pulse" && (
            <section className="card">
              <h2>{route.replace("/app/", "").toUpperCase()}</h2>
              <p className="muted">Phase 3 surface pending in this branch.</p>
            </section>
          )}
        </main>
      )}
    </div>
  );
}