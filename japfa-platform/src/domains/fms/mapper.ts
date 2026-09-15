import type { FmsDailyLog } from "@/../payload-types";

export type FmsCanonical = {
  feedConsumed?: number | null;
  mortality?: number | null;
  avgWeight: number;
};

export function toFmsCanonical(doc: FmsDailyLog): FmsCanonical {
  return {
    feedConsumed: doc.feedQtyAct,
    mortality: doc.mortAct,
    avgWeight: doc.endQty,
  };
}

export function fromFmsCanonical(input: {
  feedConsumed?: number | null;
  mortality?: number | null;
  avgWeight?: number;
}): Partial<Pick<FmsDailyLog, "feedQtyAct" | "mortAct" | "endQty">> {
  return {
    ...(input.feedConsumed === undefined
      ? {}
      : { feedQtyAct: input.feedConsumed }),
    ...(input.mortality === undefined ? {} : { mortAct: input.mortality }),
    ...(input.avgWeight === undefined ? {} : { endQty: input.avgWeight }),
  };
}
