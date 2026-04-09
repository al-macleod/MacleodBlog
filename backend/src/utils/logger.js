const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const { combine, timestamp, printf, colorize, errors, json } = format;

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    if (stack) return `${ts} [${level}]: ${message}\n${stack}`;
    return `${ts} [${level}]: ${message}`;
  })
);

const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const dailyRotateFileOptions = {
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  zippedArchive: true,
  format: fileFormat
};

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transports: [
    new transports.Console({ format: consoleFormat }),
    new transports.DailyRotateFile({
      ...dailyRotateFileOptions,
      filename: 'error-%DATE%.log',
      level: 'error'
    }),
    new transports.DailyRotateFile({
      ...dailyRotateFileOptions,
      filename: 'combined-%DATE%.log'
    })
  ],
  exitOnError: false
});

module.exports = logger;
