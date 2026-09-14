/** Normalizes any date-ish value to a comparable "YYYY-MM-DD" key (or "" if invalid). */
export const dateKey = (value: unknown) => {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
