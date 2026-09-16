import type { PayloadRequest } from "payload";

type JobInput = Record<string, unknown>;

type PayloadWithJobs = PayloadRequest["payload"] & {
  jobs?: {
    queue: (args: {
      task: string;
      input: JobInput;
      queue?: string;
    }) => Promise<unknown>;
  };
};

export const queueAfterCommit = async (
  req: PayloadRequest,
  task: string,
  input: JobInput,
  queue: string,
): Promise<boolean> => {
  if (process.env.PAYLOAD_JOBS_ENABLED !== "true") return false;

  const payload = req.payload as PayloadWithJobs;
  if (!payload.jobs) return false;

  await payload.jobs.queue({ task, input, queue });
  return true;
};
