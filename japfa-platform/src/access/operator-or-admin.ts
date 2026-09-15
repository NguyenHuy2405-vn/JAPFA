import type { Access } from "payload";

export const operatorOrAdmin: Access = ({ req: { user } }) =>
  ["ADMIN", "OPERATOR"].includes(String(user?.role));
