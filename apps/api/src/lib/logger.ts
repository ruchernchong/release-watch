type LogLevel = "debug" | "info" | "warn" | "error";

interface LogData {
  [key: string]: unknown;
}

function formatLog(
  level: LogLevel,
  component: string,
  message: string,
  data?: LogData,
): string {
  const entry = {
    level,
    component,
    message,
    ...(data && Object.keys(data).length > 0 ? data : {}),
    timestamp: new Date().toISOString(),
  };
  return JSON.stringify(entry);
}

function createLogger(component: string) {
  return {
    debug: (message: string, data?: LogData) => {
      console.log(formatLog("debug", component, message, data));
    },
    info: (message: string, data?: LogData) => {
      console.log(formatLog("info", component, message, data));
    },
    warn: (message: string, error?: unknown, data?: LogData) => {
      const errorData: LogData = { ...data };
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
        };
      } else if (error !== undefined && error !== null) {
        errorData.error = String(error);
      }
      console.warn(formatLog("warn", component, message, errorData));
    },
    error: (message: string, error?: unknown, data?: LogData) => {
      const errorData: LogData = { ...data };
      if (error instanceof Error) {
        errorData.error = {
          name: error.name,
          message: error.message,
        };
      } else if (error !== undefined) {
        errorData.error = String(error);
      }
      console.error(formatLog("error", component, message, errorData));
    },
  };
}

export const logger = {
  api: createLogger("API"),
  workflow: createLogger("Workflow"),
  bot: createLogger("Bot"),
  auth: createLogger("Auth"),
  ai: createLogger("AI"),
  scheduler: createLogger("Scheduler"),
  discord: createLogger("Discord"),
};

export { createLogger };
