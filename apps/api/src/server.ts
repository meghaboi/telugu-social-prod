import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { authOnboardingRouter } from "./routes/auth-onboarding.js";
import { pulseRouter } from "./routes/pulse.js";
import { spacesForumsRouter } from "./routes/spaces-forums.js";
import { eventsRouter } from "./routes/events.js";
import { profilesSocialRouter } from "./routes/profiles-social.js";
import { staffRouter } from "./routes/staff.js";

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.use(authOnboardingRouter);
app.use(pulseRouter);
app.use(spacesForumsRouter);
app.use(eventsRouter);
app.use(profilesSocialRouter);
app.use(staffRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.flatten() });
  }
  if (err instanceof Error && err.message === "UNAUTHORIZED") {
    return res.status(401).json({ error: "Missing x-user-id header" });
  }
  if (err instanceof Error && err.message === "STAFF_UNAUTHORIZED") {
    return res.status(401).json({ error: "Missing x-user-id or x-staff-role headers" });
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
