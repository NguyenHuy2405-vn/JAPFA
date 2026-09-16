import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

type RequestWithCollection = PayloadRequest & {
  collection?: { slug?: string };
};

export const recordIdempotency: CollectionAfterChangeHook = async ({
  req,
  doc,
  previousDoc,
}) => {
  if (!previousDoc || doc.status === previousDoc.status) return;

  const collection =
    (req as RequestWithCollection).collection?.slug ?? "unknown";
  const key = `${collection}:${doc.id}:STATUS_CHANGE:${String(doc.status)}`;
  await req.payload.create({
    req,
    collection: "idempotency-keys",
    data: {
      key,
      collection,
      action: "STATUS_CHANGE",
      resultId: String(doc.id),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    overrideAccess: true,
  });
};
