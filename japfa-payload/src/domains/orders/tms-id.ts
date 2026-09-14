import pg from "pg";
import type { PayloadClient } from "@/repositories/payload.repository";
import type { AuthUser } from "@/server/http/api-error";

const TMS_ADVISORY_LOCK_KEY = 390_902_411;
const TMS_ID_REGEX = /^TMS-(\d+)$/i;
const TMS_PAGE_SIZE = 500;

let pool: pg.Pool | null = null;

const getPool = () => {
  const connectionString = process.env.DATABASE_URI;
  if (!connectionString) throw new Error("DATABASE_URI must be configured.");
  pool ||= new pg.Pool({ connectionString });
  return pool;
};

const parseTmsSequence = (value: unknown) => {
  const sequence = Number(
    String(value || "")
      .trim()
      .match(TMS_ID_REGEX)?.[1],
  );
  return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
};

export const formatTmsId = (sequence: number) =>
  `TMS-${String(sequence).padStart(4, "0")}`;

const findCurrentMaxTmsSequence = async (
  payload: PayloadClient,
  user: AuthUser,
) => {
  let page = 1;
  let maxSequence = 0;

  while (true) {
    const result = await payload.find({
      collection: "orders",
      where: {
        and: [
          { tmsOrderId: { exists: true } },
          { tmsOrderId: { not_equals: "" } },
        ],
      },
      limit: TMS_PAGE_SIZE,
      page,
      depth: 0,
      user: user as never,
      overrideAccess: false,
    });

    for (const order of result.docs as Array<{ tmsOrderId?: string }>) {
      const sequence = parseTmsSequence(order.tmsOrderId);
      if (sequence > maxSequence) maxSequence = sequence;
    }

    if (!result.hasNextPage) break;
    page += 1;
  }

  return maxSequence;
};

const withTmsSequenceLock = async <T>(action: () => Promise<T>) => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [
      TMS_ADVISORY_LOCK_KEY,
    ]);
    const result = await action();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const withLockedSequentialTmsIds = async <T>(
  payload: PayloadClient,
  user: AuthUser,
  count: number,
  action: (tmsIds: string[]) => Promise<T>,
) => {
  if (!Number.isInteger(count) || count <= 0) {
    return action([]);
  }

  return withTmsSequenceLock(async () => {
    const currentMax = await findCurrentMaxTmsSequence(payload, user);
    const tmsIds = Array.from({ length: count }, (_, index) =>
      formatTmsId(currentMax + index + 1),
    );
    return action(tmsIds);
  });
};
