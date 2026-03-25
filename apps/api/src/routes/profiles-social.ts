import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireUser, type AuthedRequest } from "../lib/auth.js";
import { randomOtp } from "../lib/utils.js";

export const profilesSocialRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/).optional(),
  tagline: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
  schoolId: z.string().nullable().optional(),
  neighbourhoodId: z.string().nullable().optional(),
  showConnectionCount: z.boolean().optional(),
  isProfileVisible: z.boolean().optional()
});

const friendRequestSchema = z.object({
  receiverId: z.string().min(1)
});

const confirmDeleteSchema = z.object({
  code: z.string().length(6)
});

profilesSocialRouter.get("/profiles/:userId", requireUser, async (req: AuthedRequest, res) => {
  const target = await prisma.user.findUnique({
    where: { id: req.params.userId },
    include: {
      school: true,
      neighbourhood: true,
      badges: { include: { badge: true } },
      achievements: { include: { achievement: true } },
      registrations: { include: { event: true } },
      memberships: { include: { space: true } }
    }
  });
  if (!target || target.isDeleted) {
    return res.status(404).json({ error: "Profile not found" });
  }
  const connection = await prisma.friendConnection.findFirst({
    where: {
      OR: [
        { userAId: req.userId, userBId: target.id },
        { userAId: target.id, userBId: req.userId }
      ]
    }
  });
  const isFriend = Boolean(connection) || req.userId === target.id;
  if (!target.isProfileVisible && !isFriend) {
    return res.status(403).json({ error: "Profile is private" });
  }

  const base = {
    id: target.id,
    displayName: target.displayName,
    username: target.username,
    tagline: target.tagline,
    school: target.school?.name ?? null,
    totalExp: target.totalExp,
    level: target.level,
    badgeCount: target.badges.length,
    achievementCount: target.achievements.length
  };
  if (!isFriend) {
    return res.json({ profile: base, visibility: "non_friend_limited" });
  }

  const connectionCount = await prisma.friendConnection.count({
    where: { OR: [{ userAId: target.id }, { userBId: target.id }] }
  });

  res.json({
    profile: {
      ...base,
      bio: target.bio,
      photoUrl: target.photoUrl,
      neighbourhood: target.neighbourhood?.name ?? null,
      connectionCount: target.showConnectionCount ? connectionCount : null,
      badges: target.badges,
      achievements: target.achievements,
      attendedEvents: target.registrations.map((r) => r.event),
      spaces: target.memberships.map((m) => m.space)
    },
    visibility: "friend_or_owner"
  });
});

profilesSocialRouter.patch("/profiles/me", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    if (body.username) {
      const existing = await prisma.user.findFirst({
        where: { username: body.username, NOT: { id: req.userId } }
      });
      if (existing) {
        return res.status(400).json({ error: "Username already in use" });
      }
    }
    const profile = await prisma.user.update({
      where: { id: req.userId },
      data: body
    });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

profilesSocialRouter.post("/friends/requests", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = friendRequestSchema.parse(req.body);
    if (body.receiverId === req.userId) {
      return res.status(400).json({ error: "Cannot send request to yourself" });
    }
    const request = await prisma.friendRequest.upsert({
      where: { senderId_receiverId: { senderId: req.userId!, receiverId: body.receiverId } },
      update: { status: "PENDING" },
      create: {
        senderId: req.userId!,
        receiverId: body.receiverId,
        status: "PENDING"
      }
    });
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

profilesSocialRouter.post("/friends/requests/:requestId/accept", requireUser, async (req: AuthedRequest, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.requestId } });
  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }
  if (request.receiverId !== req.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }
  await prisma.friendRequest.update({
    where: { id: request.id },
    data: { status: "ACCEPTED" }
  });
  const [userAId, userBId] = [request.senderId, request.receiverId].sort();
  await prisma.friendConnection.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId }
  });
  res.json({ ok: true });
});

profilesSocialRouter.post("/users/:userId/block", requireUser, async (req: AuthedRequest, res) => {
  if (req.params.userId === req.userId) {
    return res.status(400).json({ error: "Cannot block yourself" });
  }
  await prisma.block.upsert({
    where: {
      blockerId_blockedId: { blockerId: req.userId!, blockedId: req.params.userId }
    },
    update: {},
    create: {
      blockerId: req.userId!,
      blockedId: req.params.userId
    }
  });
  res.json({ ok: true });
});

profilesSocialRouter.post("/account/delete/request-otp", requireUser, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const code = randomOtp();
  await prisma.otpSession.create({
    data: {
      phoneNumber: user.phoneNumber,
      code,
      purpose: "DELETE_ACCOUNT",
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }
  });
  res.json({ ok: true, devCode: process.env.NODE_ENV === "production" ? undefined : code });
});

profilesSocialRouter.post("/account/delete/confirm", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = confirmDeleteSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const session = await prisma.otpSession.findFirst({
      where: {
        phoneNumber: user.phoneNumber,
        code: body.code,
        purpose: "DELETE_ACCOUNT",
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!session) {
      return res.status(400).json({ error: "Invalid code" });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isDeleted: true,
        displayName: "Deleted User",
        username: null,
        tagline: null,
        bio: null,
        photoUrl: null
      }
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

