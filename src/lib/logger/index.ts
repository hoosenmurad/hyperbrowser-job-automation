import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
});

export const log = {
  debug: (msg: string) => logger.debug(msg),
  info: (msg: string) => logger.info(msg),
  warn: (msg: string) => logger.warn(msg),
  error: (msg: string) => logger.error(msg),
  success: (msg: string) => logger.info(`✅ ${msg}`),
  process: (msg: string) => logger.info(`🔄 ${msg}`),
  step: (n: number, total: number, msg: string) => logger.info(`[${n}/${total}] ${msg}`),
  jobFound: (title: string, company: string) => logger.info(`🎯 Found: ${title} at ${company}`),
  jobApplied: (title: string, company: string) => logger.info(`📨 Applied: ${title} at ${company}`),
  separator: (char = "=", len = 60) => logger.info(char.repeat(len)),
  data: (msg: string, data?: Record<string, unknown>) => {
    if (data) {
      logger.info({ msg, ...data });
    } else {
      logger.info(msg);
    }
  },
};

export { logger };

