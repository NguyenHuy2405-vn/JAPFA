// Shared HTTP error type + request-guard helpers used by every service/controller
// under src/app/api/japfa-data. Extracted from the old monolithic route.ts so
// both GET (query) and POST (command) services can throw the same typed error.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export type AuthUser = {
  id?: string | number;
  role?: string;
  tenants?: Array<string | number | { id?: string | number }>;
};

export const requireRole = (user: AuthUser, roles: string[]) => {
  if (!user.role || !roles.includes(user.role))
    throw new ApiError("Bạn không có quyền thực hiện thao tác này.", 403);
};

export const requiredText = (value: unknown, label: string) => {
  const result = String(value ?? "").trim();
  if (!result) throw new ApiError(`${label} là bắt buộc.`);
  return result;
};

export const positiveNumber = (value: unknown, label: string) => {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0)
    throw new ApiError(`${label} phải là số lớn hơn 0.`);
  return result;
};

/** Maps any thrown error to a stable {status, body} JSON shape for NextResponse. */
export const toApiResponse = (
  error: unknown,
  logLabel: string,
): { status: number; body: { success: false; error: string } } => {
  console.error(logLabel, error);
  const status = error instanceof ApiError ? error.status : 500;
  return {
    status,
    body: {
      success: false,
      error:
        status >= 500
          ? "Đã xảy ra lỗi máy chủ. Vui lòng thử lại hoặc liên hệ quản trị viên."
          : (error as Error).message,
    },
  };
};
