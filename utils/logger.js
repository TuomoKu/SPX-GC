// Import modules
const path = require('path')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// eslint-disable-next-line no-shadow
const myFormat = printf(({ level, message, label, timestamp }) => `${timestamp} [${label}] ${level}: ${message}`);


// logger.error("hello world!, this is error 0");
// logger.warn("hello world!, this is warn 1");
// logger.info("hello world!, this is info 2");
// logger.verbose("hello world!, this is verbose 3");
// logger.debug("hello world!, this is debug 4");
// logger.silly("hello world!, this is silly 5");

let LOGLEVEL = global.config.general.loglevel || 'debug';
let LOGFOLDER = global.config.general.logfolder || 'LOG';
var logFile = path.resolve(process.cwd(),LOGFOLDER, 'access.log');

const logger = createLogger({
  format: combine(
    label({ label: 'SPX GC' }),
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console({
      level: LOGLEVEL
    }),
    new transports.File({
      level: LOGLEVEL,
      filename: logFile
    })
  ]
});

// Export the logger
module.exports = logger;
