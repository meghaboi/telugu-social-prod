import { EventTier } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireStaff, type AuthedRequest } from "../lib/auth.js";

export const staffRouter = Router();

const staffTierSchema = z.object({
  tier: z.nativeEnum(EventTier)
});

const staffUserActionSchema = z.object({
  action: z.enum(["MUTE", "UNMUTE", "SOFT_DELETE"])
});

staffRouter.get("/staff/moderation/reports", requireStaff, async (_req: AuthedRequest, res) => {
  const reports = await prisma.postReport.findMany({
    include: {
      post: {
        include: { thread: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json({ reports });
});

staffRouter.post("/staff/moderation/reports/:reportId/resolve", requireStaff, async (req: AuthedRequest, res) => {
  await prisma.postReport.update({
    where: { id: req.params.reportId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedById: req.userId
    }
  });
  await prisma.staffActionAuditLog.create({
    data: {
      actorId: req.userId!,
      actorRole: req.staffRole!,
      action: "RESOLVE_REPORT",
      targetType: "POST_REPORT",
      targetId: req.params.reportId
    }
  });
  res.json({ ok: true });
});

staffRouter.get("/staff/events/review-queue", requireStaff, async (_req: AuthedRequest, res) => {
  const events = await prisma.event.findMany({
    where: { tier: EventTier.COMMUNITY },
    orderBy: { createdAt: "desc" }
  });
  res.json({ events });
});

staffRouter.post("/staff/events/:eventId/assign-tier", requireStaff, async (req: AuthedRequest, res, next) => {
  try {
    const body = staffTierSchema.parse(req.body);
    const event = await prisma.event.update({
      where: { id: req.params.eventId },
      data: { tier: body.tier }
    });
    await prisma.staffActionAuditLog.create({
      data: {
        actorId: req.userId!,
        actorRole: req.staffRole!,
        action: "ASSIGN_EVENT_TIER",
        targetType: "EVENT",
        targetId: req.params.eventId,
        metadata: JSON.stringify({ tier: body.tier })
      }
    });
    res.json({ event });
  } catch (error) {
    next(error);
  }
});

staffRouter.get("/staff/users", requireStaff, async (_req: AuthedRequest, res) => {
  const users = await prisma.user.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json({ users });
});

staffRouter.post("/staff/users/:userId/action", requireStaff, async (req: AuthedRequest, res, next) => {
  try {
    const body = staffUserActionSchema.parse(req.body);
    if (body.action === "SOFT_DELETE") {
      await prisma.user.update({
        where: { id: req.params.userId },
        data: { isDeleted: true }
      });
    }
    await prisma.staffActionAuditLog.create({
      data: {
        actorId: req.userId!,
        actorRole: req.staffRole!,
        action: body.action,
        targetType: "USER",
        targetId: req.params.userId
      }
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

staffRouter.get("/staff/audit-logs", requireStaff, async (_req: AuthedRequest, res) => {
  const logs = await prisma.staffActionAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500
  });
  res.json({ logs });
});

