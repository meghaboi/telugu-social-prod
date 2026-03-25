import type { NextFunction, Request, Response } from "express";
import { SpaceRole } from "@prisma/client";
import { prisma } from "./prisma.js";

export type AuthedRequest = Request & {
  userId?: string;
  staffRole?: string;
};

export const requireUser = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const userId = req.header("x-user-id");
  if (!userId) {
    return next(new Error("UNAUTHORIZED"));
  }
  req.userId = userId;
  next();
};

export const requireStaff = (req: AuthedRequest, _res: Response, next: NextFunction) => {
  const userId = req.header("x-user-id");
  const staffRole = req.header("x-staff-role");
  if (!userId || !staffRole) {
    return next(new Error("STAFF_UNAUTHORIZED"));
  }
  req.userId = userId;
  req.staffRole = staffRole;
  next();
};

export const getSpaceRole = async (spaceId: string, userId: string): Promise<SpaceRole | null> => {
  const membership = await prisma.spaceMembership.findUnique({
    where: { userId_spaceId: { userId, spaceId } }
  });
  return membership?.role ?? null;
};

export const canModerate = (role: SpaceRole | null) => role === SpaceRole.ADMIN || role === SpaceRole.MODERATOR;

