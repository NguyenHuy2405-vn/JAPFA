import { APIError } from "payload";
import type { Payload, PayloadRequest } from "payload";

export type IdempotencyReservation = {
  key: string;
  collection: string;
  action: string;
  resultId?: string | number;
  expiresAt?: Date;
};

export const buildStatusIdempotencyKey = (
  collection: string,
  targetId: string | number,
  status: string,
): string => `${collection}:${String(targetId)}:STATUS_CHANGE:${status}`;

export const reserveIdempotencyKey = async (
  payload: Payload,
  req: PayloadRequest,
  reservation: IdempotencyReservation,
): Promise<void> => {
  const existing = await payload.find({
    collection: "idempotency-keys",
    where: { key: { equals: reservation.key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  if (existing.docs.length > 0) {
    throw new APIError("Duplicate mutation", 409, {
      existingResultId: existing.docs[0]?.resultId,
    });
  }

  await payload.create({
    collection: "idempotency-keys",
    data: {
      key: reservation.key,
      collection: reservation.collection,
      action: reservation.action,
      resultId:
        reservation.resultId === undefined
          ? undefined
          : String(reservation.resultId),
      expiresAt: (
        reservation.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
      ).toISOString(),
    },
    overrideAccess: true,
    req,
  });
};
