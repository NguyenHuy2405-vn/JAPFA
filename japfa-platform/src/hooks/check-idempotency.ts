import { APIError } from "payload";
import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";

type RequestWithCollection = PayloadRequest & {
  collection?: { slug?: string };
};

export const checkIdempotency: CollectionBeforeChangeHook = async ({
  req,
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== "update" || !data?.status) return data;

  const targetId = String(originalDoc?.id ?? data.id ?? "unknown");

  const collection =
    (req as RequestWithCollection).collection?.slug ?? "unknown";
  const key = `${collection}:${targetId}:STATUS_CHANGE:${String(data.status)}`;
  const existing = await req.payload.find({
    collection: "idempotency-keys",
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });

  if (existing.totalDocs > 0) {
    throw new APIError("Duplicate mutation", 409, {
      existingResultId: existing.docs[0]?.resultId,
      key,
    });
  }

  return data;
};
