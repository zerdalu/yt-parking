import type { ApiResponse } from "@shared/types/api-response";
import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/api/health", (c): Response => {
  const successResponse: ApiResponse<{
    readonly status: string;
    readonly service: string;
  }> = {
    success: true,
    data: {
      status: "healthy",
      service: "Parking",
    },
  };
  return c.json(successResponse, 200);
});

app.notFound((c): Response => {
  const notFoundResponse: ApiResponse<never> = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "The requested edge endpoint was not found",
    },
  };
  return c.json(notFoundResponse, 404);
});

app.onError((err, c): Response => {
  console.error("Worker error:", err);
  const errorResponse: ApiResponse<never> = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: err.message,
    },
  };
  return c.json(errorResponse, 500);
});

export default app;
