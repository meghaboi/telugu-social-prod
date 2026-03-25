import { Router } from "express";
import { SpaceRole, SpaceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { canModerate, getSpaceRole, requireUser, type AuthedRequest } from "../lib/auth.js";

export const spacesForumsRouter = Router();

const createSpaceSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(SpaceType),
  description: z.string().optional(),
  schoolId: z.string().optional(),
  interestId: z.string().optional(),
  allowAnonymous: z.boolean().optional().default(false)
});

const createThreadSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(1),
  isAnonymous: z.boolean().optional().default(false)
});

const createReplySchema = z.object({
  body: z.string().min(1),
  parentId: z.string().optional(),
  isAnonymous: z.boolean().optional().default(false)
});

const voteSchema = z.object({
  value: z.number().int().refine((v) => v === 1 || v === -1)
});

const reportSchema = z.object({
  reason: z.string().min(4)
});

const moderationActionSchema = z.object({
  action: z.enum(["delete", "lock", "mute"]),
  reason: z.string().optional()
});

spacesForumsRouter.get("/spaces", requireUser, async (req: AuthedRequest, res) => {
  const memberships = await prisma.spaceMembership.findMany({
    where: { userId: req.userId },
    include: { space: true }
  });
  res.json({ spaces: memberships.map((m) => ({ ...m.space, role: m.role })) });
});

spacesForumsRouter.post("/spaces", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const payload = createSpaceSchema.parse(req.body);
    const space = await prisma.space.create({
      data: { ...payload, createdByUserId: req.userId }
    });
    await prisma.spaceMembership.create({
      data: {
        userId: req.userId!,
        spaceId: space.id,
        role: SpaceRole.ADMIN
      }
    });
    res.status(201).json({ space });
  } catch (error) {
    next(error);
  }
});

spacesForumsRouter.get("/spaces/:spaceId", requireUser, async (req: AuthedRequest, res) => {
  const membership = await prisma.spaceMembership.findUnique({
    where: { userId_spaceId: { userId: req.userId!, spaceId: req.params.spaceId } },
    include: { space: true }
  });
  if (!membership) {
    return res.status(404).json({ error: "Not a member of this space" });
  }
  res.json({ space: membership.space, role: membership.role });
});

spacesForumsRouter.post("/spaces/:spaceId/join", requireUser, async (req: AuthedRequest, res) => {
  await prisma.spaceMembership.upsert({
    where: { userId_spaceId: { userId: req.userId!, spaceId: req.params.spaceId } },
    update: {},
    create: { userId: req.userId!, spaceId: req.params.spaceId, role: SpaceRole.MEMBER }
  });
  res.json({ ok: true });
});

spacesForumsRouter.post("/spaces/:spaceId/leave", requireUser, async (req: AuthedRequest, res) => {
  await prisma.spaceMembership.deleteMany({
    where: { userId: req.userId, spaceId: req.params.spaceId }
  });
  res.json({ ok: true });
});

spacesForumsRouter.get("/spaces/:spaceId/threads", requireUser, async (req: AuthedRequest, res) => {
  const sort = String(req.query.sort ?? "latestActivity");
  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "top"
        ? undefined
        : { updatedAt: "desc" as const };

  const member = await prisma.spaceMembership.findUnique({
    where: { userId_spaceId: { userId: req.userId!, spaceId: req.params.spaceId } }
  });
  if (!member) {
    return res.status(403).json({ error: "Not a member" });
  }

  const threads = await prisma.thread.findMany({
    where: { spaceId: req.params.spaceId, isDeleted: false },
    include: {
      author: { select: { id: true, displayName: true, username: true } },
      posts: { select: { id: true } }
    },
    orderBy
  });

  const enriched = await Promise.all(
    threads.map(async (thread) => {
      const votes = await prisma.postVote.aggregate({
        _sum: { value: true },
        where: { post: { threadId: thread.id } }
      });
      return {
        ...thread,
        voteScore: votes._sum.value ?? 0,
        replyCount: thread.posts.length
      };
    })
  );

  const sorted = sort === "top" ? enriched.sort((a, b) => b.voteScore - a.voteScore) : enriched;
  res.json({ threads: sorted });
});

spacesForumsRouter.post("/spaces/:spaceId/threads", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = createThreadSchema.parse(req.body);
    const member = await prisma.spaceMembership.findUnique({
      where: { userId_spaceId: { userId: req.userId!, spaceId: req.params.spaceId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member" });
    }
    const mute = await prisma.spaceMute.findUnique({
      where: { spaceId_userId: { spaceId: req.params.spaceId, userId: req.userId! } }
    });
    if (mute && (!mute.mutedUntil || mute.mutedUntil > new Date())) {
      return res.status(403).json({ error: "Muted in this space" });
    }
    const space = await prisma.space.findUnique({ where: { id: req.params.spaceId } });
    const anonymousAllowed = space?.type === SpaceType.SCHOOL && space.allowAnonymous;
    if (body.isAnonymous && !anonymousAllowed) {
      return res.status(400).json({ error: "Anonymous posting is not allowed in this space" });
    }
    const thread = await prisma.thread.create({
      data: {
        spaceId: req.params.spaceId,
        authorId: req.userId!,
        title: body.title,
        body: body.body,
        isAnonymous: body.isAnonymous
      }
    });
    res.status(201).json({ thread });
  } catch (error) {
    next(error);
  }
});

spacesForumsRouter.get("/threads/:threadId", requireUser, async (req: AuthedRequest, res) => {
  const thread = await prisma.thread.findUnique({
    where: { id: req.params.threadId },
    include: { author: { select: { id: true, displayName: true, username: true } } }
  });
  if (!thread || thread.isDeleted) {
    return res.status(404).json({ error: "Thread not found" });
  }
  const member = await prisma.spaceMembership.findUnique({
    where: { userId_spaceId: { userId: req.userId!, spaceId: thread.spaceId } }
  });
  if (!member) {
    return res.status(403).json({ error: "Not a member" });
  }
  const posts = await prisma.post.findMany({
    where: { threadId: thread.id, isDeleted: false },
    include: {
      author: { select: { id: true, displayName: true, username: true } },
      votes: true
    },
    orderBy: { createdAt: "asc" }
  });
  res.json({
    thread: {
      ...thread,
      authorLabel: thread.isAnonymous
        ? "Anonymous member"
        : thread.author.displayName ?? thread.author.username ?? "Member",
      author: thread.isAnonymous ? null : thread.author
    },
    posts: posts.map((post) => ({
      ...post,
      authorLabel: post.isAnonymous
        ? "Anonymous member"
        : post.author.displayName ?? post.author.username ?? "Member",
      author: post.isAnonymous ? null : post.author,
      voteScore: post.votes.reduce((acc, v) => acc + v.value, 0)
    }))
  });
});

spacesForumsRouter.post("/threads/:threadId/replies", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = createReplySchema.parse(req.body);
    const thread = await prisma.thread.findUnique({ where: { id: req.params.threadId } });
    if (!thread || thread.isDeleted) {
      return res.status(404).json({ error: "Thread not found" });
    }
    if (thread.isLocked) {
      return res.status(400).json({ error: "Thread is locked" });
    }
    const member = await prisma.spaceMembership.findUnique({
      where: { userId_spaceId: { userId: req.userId!, spaceId: thread.spaceId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member" });
    }
    const mute = await prisma.spaceMute.findUnique({
      where: { spaceId_userId: { spaceId: thread.spaceId, userId: req.userId! } }
    });
    if (mute && (!mute.mutedUntil || mute.mutedUntil > new Date())) {
      return res.status(403).json({ error: "Muted in this space" });
    }
    const space = await prisma.space.findUnique({ where: { id: thread.spaceId } });
    const anonymousAllowed = space?.type === SpaceType.SCHOOL && space.allowAnonymous;
    if (body.isAnonymous && !anonymousAllowed) {
      return res.status(400).json({ error: "Anonymous posting is not allowed in this space" });
    }
    if (body.parentId) {
      const parent = await prisma.post.findUnique({ where: { id: body.parentId } });
      if (!parent || parent.threadId !== thread.id) {
        return res.status(400).json({ error: "Invalid parentId" });
      }
    }
    const post = await prisma.post.create({
      data: {
        threadId: thread.id,
        authorId: req.userId!,
        parentId: body.parentId,
        body: body.body,
        isAnonymous: body.isAnonymous
      }
    });
    await prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });
    res.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

spacesForumsRouter.post("/posts/:postId/vote", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = voteSchema.parse(req.body);
    const post = await prisma.post.findUnique({
      where: { id: req.params.postId },
      include: { thread: true }
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const member = await prisma.spaceMembership.findUnique({
      where: { userId_spaceId: { userId: req.userId!, spaceId: post.thread.spaceId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member" });
    }
    await prisma.postVote.upsert({
      where: { postId_userId: { postId: post.id, userId: req.userId! } },
      update: { value: body.value },
      create: { postId: post.id, userId: req.userId!, value: body.value }
    });
    const score = await prisma.postVote.aggregate({
      _sum: { value: true },
      where: { postId: post.id }
    });
    res.json({ ok: true, voteScore: score._sum.value ?? 0 });
  } catch (error) {
    next(error);
  }
});

spacesForumsRouter.post("/posts/:postId/report", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = reportSchema.parse(req.body);
    const post = await prisma.post.findUnique({
      where: { id: req.params.postId },
      include: { thread: true }
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const member = await prisma.spaceMembership.findUnique({
      where: { userId_spaceId: { userId: req.userId!, spaceId: post.thread.spaceId } }
    });
    if (!member) {
      return res.status(403).json({ error: "Not a member" });
    }
    const report = await prisma.postReport.create({
      data: {
        postId: post.id,
        reportedById: req.userId!,
        reason: body.reason
      }
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

spacesForumsRouter.post("/posts/:postId/moderation-action", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = moderationActionSchema.parse(req.body);
    const post = await prisma.post.findUnique({
      where: { id: req.params.postId },
      include: { thread: true }
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const role = await getSpaceRole(post.thread.spaceId, req.userId!);
    if (!canModerate(role)) {
      return res.status(403).json({ error: "Insufficient permission" });
    }
    if (body.action === "delete") {
      await prisma.post.update({ where: { id: post.id }, data: { isDeleted: true } });
    }
    if (body.action === "lock") {
      await prisma.thread.update({ where: { id: post.threadId }, data: { isLocked: true } });
    }
    if (body.action === "mute") {
      await prisma.spaceMute.upsert({
        where: { spaceId_userId: { spaceId: post.thread.spaceId, userId: post.authorId } },
        update: { reason: body.reason ?? "Muted by moderation action" },
        create: {
          spaceId: post.thread.spaceId,
          userId: post.authorId,
          createdById: req.userId!,
          reason: body.reason ?? "Muted by moderation action"
        }
      });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

