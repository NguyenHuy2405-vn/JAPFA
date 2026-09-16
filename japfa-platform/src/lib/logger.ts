export const logger = {
  info: (objOrMsg: unknown, msg?: string) => {
    if (typeof objOrMsg === "string") {
      console.log(
        JSON.stringify({
          level: "info",
          service: "japfa-platform",
          message: objOrMsg,
        }),
      );
    } else {
      console.log(
        JSON.stringify({
          level: "info",
          service: "japfa-platform",
          ...(typeof objOrMsg === "object" && objOrMsg !== null
            ? objOrMsg
            : { data: objOrMsg }),
          message: msg,
        }),
      );
    }
  },
  error: (objOrMsg: unknown, msg?: string) => {
    if (typeof objOrMsg === "string") {
      console.error(
        JSON.stringify({
          level: "error",
          service: "japfa-platform",
          message: objOrMsg,
        }),
      );
    } else {
      console.error(
        JSON.stringify({
          level: "error",
          service: "japfa-platform",
          ...(typeof objOrMsg === "object" && objOrMsg !== null
            ? objOrMsg
            : { data: objOrMsg }),
          message: msg,
        }),
      );
    }
  },
  warn: (objOrMsg: unknown, msg?: string) => {
    if (typeof objOrMsg === "string") {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "japfa-platform",
          message: objOrMsg,
        }),
      );
    } else {
      console.warn(
        JSON.stringify({
          level: "warn",
          service: "japfa-platform",
          ...(typeof objOrMsg === "object" && objOrMsg !== null
            ? objOrMsg
            : { data: objOrMsg }),
          message: msg,
        }),
      );
    }
  },
};
