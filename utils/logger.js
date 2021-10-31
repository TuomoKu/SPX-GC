// Import modules
const path = require('path')
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});


// logger.error("hello world!, this is error 0");
// logger.warn("hello world!, this is warn 1");
// logger.info("hello world!, this is info 2");
// logger.verbose("hello world!, this is verbose 3");
// logger.debug("hello world!, this is debug 4");
// logger.silly("hello world!, this is silly 5");

let rootPath  
if ( process.pkg ) {
  // PKG process
  rootPath = path.resolve(process.execPath + '/..');
} else {
  // NODE process
  rootPath = process.cwd();
}

let LOGLEVEL = config.general.loglevel || 'debug';
let LOGFOLDER = config.general.logfolder || rootPath + '/LOG';
var logFile = path.resolve(LOGFOLDER, 'access.log');

const logger = createLogger({
  format: combine(
    label({ label: 'SPX' }),
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