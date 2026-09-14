import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import type { SessionPayload } from "@/types/auth.types";
import type { User, Tenant } from "../../payload-types";

const SESSION_COOKIE = "japfa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

const secret = () =>
  process.env.JAPFA_AUTH_SECRET || process.env.PAYLOAD_SECRET || "";

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString();

const sign = (value: string) =>
  crypto.createHmac("sha256", secret()).update(value).digest("base64url");

const verifySignature = (value: string, signature: string) => {
  const expected = Buffer.from(sign(value));
  const received = Buffer.from(signature);
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
};

export const createSession = async (
  userId: string | number,
  authzVersion: number = 1,
) => {
  const payloadData: SessionPayload = {
    userId: String(userId),
    authzVersion: authzVersion ?? 1,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const payload = encode(JSON.stringify(payloadData));
  const value = `${payload}.${sign(payload)}`;
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
};

export const clearSession = async () => {
  (await cookies()).delete(SESSION_COOKIE);
};

export const getSession = async (): Promise<SessionPayload | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const encodedPayload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!verifySignature(encodedPayload, signature)) return null;

  try {
    const session = JSON.parse(
      decode(encodedPayload),
    ) as Partial<SessionPayload>;
    if (
      session.userId &&
      typeof session.authzVersion === "number" &&
      session.expiresAt &&
      session.expiresAt > Date.now()
    ) {
      return {
        userId: session.userId,
        authzVersion: session.authzVersion,
        expiresAt: session.expiresAt,
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const getAppUser = async (): Promise<User | null> => {
  const session = await getSession();
  if (!session) return null;
  const payload = await getPayload({ config });
  try {
    // Note: overrideAccess: true is required here because getAppUser bootstraps
    // the user session context before role access permissions can be evaluated.
    const user = (await payload.findByID({
      collection: "users",
      id: session.userId,
      depth: 2,
      overrideAccess: true,
    })) as User;

    if (!user) return null;

    // CHECK 1: accountStatus must be ACTIVE
    if (user.accountStatus !== "ACTIVE") {
      return null;
    }

    // CHECK 2: authzVersion must match session (fallback 1 for legacy users)
    const userAuthzVersion = user.authzVersion ?? 1;
    if (userAuthzVersion !== session.authzVersion) {
      return null;
    }

    // CHECK 3: primaryTenant.status must not be LOCKED
    if (user.primaryTenant && typeof user.primaryTenant === "object") {
      const tenant = user.primaryTenant as Tenant;
      if (tenant.status === "LOCKED") {
        return null;
      }
    }

    return user;
  } catch {
    return null;
  }
};

export const incrementAuthzVersion = async (
  payload: Payload,
  userId: string | number,
): Promise<number> => {
  const user = await payload.findByID({
    collection: "users",
    id: userId,
    depth: 0,
    overrideAccess: true,
  });
  const nextVersion =
    ((user as { authzVersion?: number }).authzVersion || 1) + 1;
  await payload.update({
    collection: "users",
    id: userId,
    data: { authzVersion: nextVersion },
    overrideAccess: true,
  });
  return nextVersion;
};

export const getRoleLandingPage = (role?: string | null): string => {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "OPERATION") return "/operation/dashboard";
  if (role === "FARM") return "/farm/dashboard";
  return "/";
};

export const verifyPassword = async (
  password: string,
  salt: string,
  hash: string,
) => {
  const derivedHash = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, 25000, 512, "sha256", (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  const expectedHash = Buffer.from(hash, "hex");
  return (
    derivedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(derivedHash, expectedHash)
  );
};

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
