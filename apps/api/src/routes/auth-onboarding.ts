import { Router } from "express";
import { SpaceRole, SpaceType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { randomOtp } from "../lib/utils.js";
import { requireUser, type AuthedRequest } from "../lib/auth.js";

export const authOnboardingRouter = Router();

const otpRequestSchema = z.object({
  phoneNumber: z.string().min(10),
  purpose: z.enum(["LOGIN", "DELETE_ACCOUNT"]).default("LOGIN")
});

const otpVerifySchema = z.object({
  phoneNumber: z.string().min(10),
  code: z.string().length(6),
  purpose: z.enum(["LOGIN", "DELETE_ACCOUNT"]).default("LOGIN")
});

const onboardingProfileSchema = z.object({
  displayName: z.string().min(2),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
  schoolId: z.string().optional().nullable(),
  neighbourhoodId: z.string()
});

const onboardingInterestsSchema = z.object({
  interestIds: z.array(z.string()).length(5)
});

authOnboardingRouter.post("/auth/otp/request", async (req, res, next) => {
  try {
    const { phoneNumber, purpose } = otpRequestSchema.parse(req.body);
    const code = randomOtp();
    await prisma.otpSession.create({
      data: {
        phoneNumber,
        code,
        purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    res.json({
      ok: true,
      devCode: process.env.NODE_ENV === "production" ? undefined : code
    });
  } catch (error) {
    next(error);
  }
});

authOnboardingRouter.post("/auth/otp/resend", async (req, res, next) => {
  try {
    const payload = otpRequestSchema.parse(req.body);
    const code = randomOtp();
    await prisma.otpSession.create({
      data: {
        phoneNumber: payload.phoneNumber,
        code,
        purpose: payload.purpose,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    res.json({
      ok: true,
      devCode: process.env.NODE_ENV === "production" ? undefined : code
    });
  } catch (error) {
    next(error);
  }
});

authOnboardingRouter.post("/auth/otp/verify", async (req, res, next) => {
  try {
    const { phoneNumber, code, purpose } = otpVerifySchema.parse(req.body);
    const session = await prisma.otpSession.findFirst({
      where: {
        phoneNumber,
        code,
        purpose,
        isVerified: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    if (!session) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }
    await prisma.otpSession.update({ where: { id: session.id }, data: { isVerified: true } });

    let user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user && purpose === "LOGIN") {
      user = await prisma.user.create({ data: { phoneNumber } });
    }
    res.json({
      ok: true,
      userId: user?.id ?? null,
      onboardingCompleted: Boolean(user?.onboardingCompletedAt)
    });
  } catch (error) {
    next(error);
  }
});

authOnboardingRouter.get("/meta/schools", async (_req, res) => {
  const schools = await prisma.school.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  res.json({ schools });
});

authOnboardingRouter.get("/meta/neighbourhoods", async (_req, res) => {
  const neighbourhoods = await prisma.neighbourhood.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
  res.json({ neighbourhoods });
});

authOnboardingRouter.get("/meta/interests", async (_req, res) => {
  const interests = await prisma.interest.findMany({ where: { isActive: true }, orderBy: { label: "asc" } });
  res.json({ interests });
});

authOnboardingRouter.post("/onboarding/profile", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const body = onboardingProfileSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { username: body.username, NOT: { id: req.userId } }
    });
    if (existing) {
      return res.status(400).json({ error: "Username is already taken" });
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        displayName: body.displayName,
        username: body.username,
        schoolId: body.schoolId ?? null,
        neighbourhoodId: body.neighbourhoodId
      }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authOnboardingRouter.post("/onboarding/interests", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const { interestIds } = onboardingInterestsSchema.parse(req.body);
    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId: req.userId } }),
      prisma.userInterest.createMany({
        data: interestIds.map((interestId) => ({ userId: req.userId!, interestId }))
      })
    ]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authOnboardingRouter.post("/onboarding/complete", requireUser, async (req: AuthedRequest, res, next) => {
  try {
    const { interestIds } = onboardingInterestsSchema.parse(req.body);
    await prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({ where: { userId: req.userId } });
      await tx.userInterest.createMany({
        data: interestIds.map((interestId) => ({ userId: req.userId!, interestId }))
      });

      const existingOfficial = await tx.space.findMany({
        where: { type: SpaceType.OFFICIAL, interestId: { in: interestIds } }
      });

      for (const interestId of interestIds) {
        const found = existingOfficial.find((space) => space.interestId === interestId);
        const space =
          found ??
          (await tx.space.create({
            data: {
              name: `Official: ${interestId}`,
              type: SpaceType.OFFICIAL,
              interestId
            }
          }));

        await tx.spaceMembership.upsert({
          where: { userId_spaceId: { userId: req.userId!, spaceId: space.id } },
          update: {},
          create: { userId: req.userId!, spaceId: space.id, role: SpaceRole.MEMBER }
        });
      }

      await tx.user.update({
        where: { id: req.userId },
        data: { onboardingCompletedAt: new Date() }
      });
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
