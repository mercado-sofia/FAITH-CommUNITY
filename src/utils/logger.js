import pino from 'pino';

// Create a centralized logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'smtp',
      'jwt_secret',
      'csrf_secret'
    ],
    remove: true,
  },
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { 
      colorize: true,
      ignore: 'pid,hostname'
    }
  }
});

// Export logger methods
export const logError = (message, error = null, context = {}) => {
  logger.error({
    ...context,
    error: error?.message || error,
    stack: error?.stack
  }, message);
};

export const logWarn = (message, context = {}) => {
  logger.warn(context, message);
};

export const logInfo = (message, context = {}) => {
  logger.info(context, message);
};

export const logDebug = (message, context = {}) => {
  logger.debug(context, message);
};

// Export the logger instance for direct use
export default logger;
