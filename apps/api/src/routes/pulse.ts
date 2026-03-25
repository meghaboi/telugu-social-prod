import { Router } from "express";
import { EventTier } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireUser, type AuthedRequest } from "../lib/auth.js";
import { uniqueById } from "../lib/utils.js";

export const pulseRouter = Router();

pulseRouter.get("/pulse", requireUser, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const connections = await prisma.friendConnection.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] }
  });
  const friendIds = connections.map((c) => (c.userAId === userId ? c.userBId : c.userAId));
  const interestIds = (
    await prisma.userInterest.findMany({ where: { userId }, select: { interestId: true } })
  ).map((x) => x.interestId);
  const spaceIds = (
    await prisma.spaceMembership.findMany({ where: { userId }, select: { spaceId: true } })
  ).map((x) => x.spaceId);

  const tierFilter = { in: [EventTier.OFFICIAL, EventTier.VERIFIED] };

  const fromFriends = await prisma.event.findMany({
    where: {
      tier: tierFilter,
      registrations: { some: { userId: { in: friendIds } } }
    },
    orderBy: { startAt: "asc" },
    take: 50
  });

  const fromInterests = await prisma.event.findMany({
    where: {
      tier: tierFilter,
      categoryInterestId: { in: interestIds }
    },
    orderBy: { startAt: "asc" },
    take: 50
  });

  const fromSpacesOrPromoted = await prisma.event.findMany({
    where: {
      tier: tierFilter,
      OR: [{ spaceId: { in: spaceIds } }, { isPromoted: true }]
    },
    orderBy: { startAt: "asc" },
    take: 50
  });

  const friends = uniqueById(fromFriends).slice(0, 5);
  const interests = uniqueById(fromInterests).slice(0, 5);
  const spacesOrPromoted = uniqueById(fromSpacesOrPromoted).slice(0, 5);

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      userId,
      event: { endAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
    },
    include: { event: true },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    pinnedEvent: registration?.event ?? null,
    groups: { friends, interests, spacesOrPromoted },
    totalEntries: friends.length + interests.length + spacesOrPromoted.length
  });
});

pulseRouter.get("/pulse/pinned-event", requireUser, async (req: AuthedRequest, res) => {
  const registration = await prisma.eventRegistration.findFirst({
    where: {
      userId: req.userId,
      event: { endAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) } }
    },
    include: { event: true },
    orderBy: { createdAt: "desc" }
  });
  res.json({ event: registration?.event ?? null });
});

