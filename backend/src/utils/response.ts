import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Standardized API response wrapper.
 * All responses follow: { success, data?, error?, meta? }
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
  message?: string
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  });
}

export function sendError(
  res: Response,
  error: string,
  statusCode = 500
): void {
  res.status(statusCode).json({
    success: false,
    error,
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, 201, undefined, message);
}

export function sendNotFound(res: Response, resource = 'Resource'): void {
  sendError(res, `${resource} not found`, 404);
}

export function sendForbidden(res: Response, message = 'Access denied'): void {
  sendError(res, message, 403);
}

export function sendConflict(res: Response, message: string): void {
  sendError(res, message, 409);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized'): void {
  sendError(res, message, 401);
}

export function sendValidationError(res: Response, message: string): void {
  sendError(res, message, 422);
}

// Global error handler middleware
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string };
    if (prismaErr.code === 'P2002') {
      sendError(res, 'A record with this value already exists.', 409);
      return;
    }
    if (prismaErr.code === 'P2025') {
      sendNotFound(res);
      return;
    }
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

