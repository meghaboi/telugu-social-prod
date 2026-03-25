import { EventTier } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireUser, type AuthedRequest } from "../lib/auth.js";

export const eventsRouter = Router();

const createEventSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(4),
  schedule: z.string().min(1),
  venue: z.string().min(2),
  area: z.string().min(2),
  startAt: z.string(),
  endAt: z.string(),
  price: z.number().int().nonnegative().default(0),
  tier: z.nativeEnum(EventTier).default(EventTier.COMMUNITY),
  categoryInterestId: z.string().optional(),
  spaceId: z.string().optional(),
  isPromoted: z.boolean().optional().default(false)
});

const eventRegisterSchema = z.object({
  answersJson: z.string().optional()
});

eventsRouter.get("/events", requireUser, async (req: AuthedRequest, res) => {
  const category = req.query.category as string | undefined;
  const area = req.query.area as string | undefined;
  const tier = req.query.tier as EventTier | undefined;
  const priceFilter = req.query.price as string | undefined;
  const date = req.query.date as string | undefined;

  const events = await prisma.event.findMany({
    where: {
      ...(category ? { categoryInterestId: category } : {}),
      ...(area ? { area } : {}),
      ...(tier ? { tier } : {}),
      ...(priceFilter === "free"
        ? { price: 0 }
        : priceFilter === "paid"
          ? { price: { gt: 0 } }
          : {}),
      ...(date
        ? {
            startAt: {
              gte: new Date(`${date}T00:00:00.000Z`),
              lte: new Date(`${date}T23:59:59.999Z`)
            }
          }
        : {})
    },
    include: {
      registrations: {
        include: {
          user: { select: { id: true, displayName: true, username: true, photoUrl: true } }
        }
      }
    },
    orderBy: { startAt: "asc" }
  });
  res.json({ events });
});

eventsRouter.post("/events", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = createEventSchema.parse(req.body);
    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        schedule: body.schedule,
        venue: body.venue,
        area: body.area,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        price: body.price,
        tier: body.tier,
        categoryInterestId: body.categoryInterestId,
        spaceId: body.spaceId,
        isPromoted: body.isPromoted,
        creatorId: req.userId!
      }
    });
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get("/events/:eventId", requireUser, async (req: AuthedRequest, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.eventId },
    include: {
      updates: true,
      registrations: {
        include: {
          user: { select: { id: true, displayName: true, username: true, photoUrl: true } }
        }
      }
    }
  });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  res.json({ event });
});

eventsRouter.post("/events/:eventId/register", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = eventRegisterSchema.parse(req.body);
    const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (event.price > 0) {
      return res.status(400).json({ error: "Paid events are Phase 2 scope" });
    }

    const registration = await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: event.id, userId: req.userId! } },
      update: { answersJson: body.answersJson ?? null },
      create: {
        eventId: event.id,
        userId: req.userId!,
        answersJson: body.answersJson ?? null,
        qrToken: `QR-${event.id}-${req.userId}-${Date.now()}`
      }
    });
    res.status(201).json({ registration });
  } catch (error) {
    next(error);
  }
});

eventsRouter.get("/events/:eventId/registrations/me", requireUser, async (req: AuthedRequest, res) => {
  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: req.params.eventId, userId: req.userId! } }
  });
  res.json({ registration });
});

