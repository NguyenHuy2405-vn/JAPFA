type ApiErrorResult = {
  success: false;
  error: string;
  status?: number;
};

type ApiResponse =
  | ({ success: boolean } & Record<string, unknown>)
  | ApiErrorResult;

const SESSION_EXPIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

const CONNECTION_ERROR_MESSAGE = "Không thể kết nối tới máy chủ.";

const normalizeErrorByStatus = (status: number) => {
  if (status === 401) return SESSION_EXPIRED_MESSAGE;
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status >= 500) return "Máy chủ đang gặp lỗi. Vui lòng thử lại sau.";
  return `Yêu cầu thất bại (HTTP ${status}).`;
};

const parseApiResponse = async (res: Response): Promise<ApiResponse> => {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    try {
      const data = (await res.json()) as
        | (({ success: boolean } & Record<string, unknown>) | null)
        | undefined;
      if (data && typeof data === "object") {
        if (typeof data.success === "boolean") return data as ApiResponse;
        return res.ok
          ? ({ success: true, data } as ApiResponse)
          : {
              success: false,
              error: normalizeErrorByStatus(res.status),
              status: res.status,
            };
      }
    } catch {
      // Fall through to textual error handling.
    }
  }

  if (res.ok) {
    return { success: true };
  }

  return {
    success: false,
    error: normalizeErrorByStatus(res.status),
    status: res.status,
  };
};

export const getJson = async (url: string): Promise<ApiResponse> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return await parseApiResponse(res);
  } catch {
    return { success: false, error: CONNECTION_ERROR_MESSAGE };
  }
};

export const postJson = async (
  url: string,
  body: Record<string, unknown>,
): Promise<ApiResponse> => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await parseApiResponse(res);
  } catch {
    return { success: false, error: CONNECTION_ERROR_MESSAGE };
  }
};
