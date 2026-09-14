import type { SetupSection } from "@/types/setup.types";
import { getJson, postJson } from "@/services/api/http";

async function postAction(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string } & Record<string, unknown>> {
  return postJson("/api/japfa-data", {
    action,
    ...payload,
  }) as Promise<{ success: boolean; error?: string } & Record<string, unknown>>;
}

export async function fetchSetupSection(
  sub: SetupSection,
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  return getJson(`/api/japfa-data?tab=setup&sub=${sub}`) as Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;
}

export const upsertSetup = (
  sub: "account" | "product" | "feed" | "policy",
  data: Record<string, unknown>,
  confirmUpdate: boolean,
) => postAction("upsert_setup", { sub, data, confirmUpdate });
