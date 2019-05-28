const dateformat = require('dateformat')
const dgram = require('dgram')
const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
const boxTools = require('boxtoolsjs')

// .:: In the event of electron ::.
// Electron will be required when needed... however we need to set some gloabal variables for it to get used correctly.
var ipcRenderer //= require('electron')
var remote // = reuqire('electron')

/**
 * The preferred set of levels
 * @description An ENUM descriptor of the different log levels
 * @enum {number}
 */
var logLevels = {
  UNGODLY: -1000,
  INFO: 0,
  DEBUG: 10,
  WARN: 20,
  ERROR: 30,
  FAILURE: 50,
  GODLY: 1000,
}

/**
 * @description An ENUM descriptor of the different end points
 * @enum {number}
 */
var logEndpoints = {
  CONSOLE: 0,
  FILE: 1,
  UDP: 2,
  ELECTRON_CONSOLE: 3,
  CUSTOM: 99,
}

class Logger extends EventEmitter {
  constructor(options = {}) {
    super()
    // A log stream is where the log info will go (ie console, text file, udp...) it should be open enough to accept pretty much anything
    this.loggers = []
    this.udpClients = {} // A place to store the udp clients
    this.logLevel = logLevels.INFO
    this.dateFormat = options.dateFormat || 'yyyy-mm-dd HH:MM:ss.l' // You can find formatting options here https://www.npmjs.com/package/dateformat
    this.isElectron = false
    this.selfLog = false
  }
  /**
   *
   * @param {Object} logStream
   * @property {Object} logStream
   * @property {string} logStream.name - The name of the log stream
   * @property {logEndpoints} logStream.type  - The type of log stream [console | file]
   */
  addEndpoint(logStream) {
    this.loggers.push(logStream)
    // TODO: add handling for Network logging here
    switch (logStream.type) {
      case logEndpoints.UDP:
        this.udpClients[logStream.name] = this._createUdpClient(logStream.ipAddress, logStream.port || 2485, logStream.udpBind || false)
        break
      default:
        break
    }
    this.info(
      `New logger added:: Name: ${logStream.name}, Log Level: ${boxTools.ListTools.getKeyByValue(logLevels, logStream.logLevel || this.logLevel)}, Type: ${boxTools.EnumTools.nameFromEnumValue(
        logEndpoints,
        logStream.type,
      )}`,
    )
  }

  /**
   * @description The base logger. You are better off using one of the log levels instead
   * @param {String} logMessage [var x = 1]
   * @param {logLevels} logLevel [logLevels.DEBUG] 
  
   */
  _log(logMessage, logLevel = logLevels.INFO) {
    this.loggers.forEach((logger) => {
      const activeLogger = logger
      const shouldLog = logLevel >= activeLogger.logLevel && logLevel >= this.logLevel

      // For logging the logger... weird, right?
      this._logLocal('Active logger:', activeLogger)
      this._logLocal('Log Level:', this.logLevel)
      this._logLocal('Local Log Level:', logLevel)
      this._logLocal('Should log:', shouldLog)

      if (shouldLog) {
        // Build out the data to log
        const now = new Date()
        const date = dateformat(now, this.dateFormat)
        const logData = `${date} ${boxTools.ListTools.getKeyByValue(logLevels, Number(logLevel)).toLocaleUpperCase()}:: ${logMessage}`

        // Logger specifics

        // Loop through all of the loggers
        switch (activeLogger.type) {
          case logEndpoints.CONSOLE:
            console.log(logData)
            break
          case logEndpoints.ELECTRON_CONSOLE:
            // We're savvy enough to know we're using Electron, so lets just enable it
            if (!this.isElectron) {
              this.useElectron()
            }
            ipcRenderer.send(activeLogger.channel || 'log', logData)
            break

          case logEndpoints.FILE:
            // File specifics
            const fullFilePath = path.join(activeLogger.filePath, activeLogger.fileName) || path.join('./', 'log.txt')
            const dataWithNewLines = logData + '\r'

            // NOW we can do all of the logging
            fs.appendFileSync(fullFilePath, dataWithNewLines)
            break

          case logEndpoints.UDP:
            // console.log('UDP Bitches!')

            const bufferedMessage = Buffer.from(logData)
            this.udpClients[activeLogger.name].send(bufferedMessage, activeLogger.port, activeLogger.ipaddress)
            // this.udpClients[activeLogger.name].close()
            break

          case logEndpoints.CUSTOM:
            activeLogger.customFunction(logData)
            break
          default:
            console.log(Date.now(), 'Unknown type of logger', activeLogger.logLevel)
        }
      }
    })
  }

  /**
   * @description send an info message to the logger
   * @param {string} data
   * @memberof Logger
   */
  info(data) {
    this._log(data, logLevels.INFO)
  }

  /**
   * @description Send a debug message to the logger
   * @param {string} data
   * @memberof Logger
   */
  debug(data) {
    this._log(data, logLevels.DEBUG)
  }

  /**
   * @description Send a warning to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  warn(logMessage) {
    this._log(logMessage, logLevels.WARN)
  }

  /**
   * @description Send a error to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  error(logMessage) {
    this._log(logMessage, logLevels.ERROR)
  }
  /**
   * @description Send a failure to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  error(logMessage) {
    this._log(logMessage, logLevels.FAILURE)
  }

  /**
   * @description Send a GODLY message to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  godly(logMessage) {
    this._log(logMessage, logLevels.GODLY)
  }

  // TODO: Exclude anything other than whats in the loglevel
  /**
   * @description Changes the main log level
   * @param {logLevels} logLevel
   * @memberof Logger
   */
  setLogLevel(logLevel) {
    this.warn(`Log level changed to ${boxTools.ListTools.getKeyByValue(logLevels, logLevel).toUpperCase()}`)
    this.logLevel = logLevel
  }

  /**
   * This enables ussage in an electron app.
   */
  useElectron() {
    this.isElectron = true
    ipcRenderer = require('electron').ipcRenderer
    remote = require('electron').remote
  }

  /**
   * @deprecated Use Boxtoolsjs
   * @description Returns the key name given a list and vaule
   * @param {*} object
   * @param {*} value
   * @returns String of the
   * @memberof Logger
   */
  _getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value)
  }

  /**
   *
   * @param {string} data
   */
  _logLocal(data) {
    if (this.selfLog) {
      console.log(data)
    }
  }

  _createUdpClient(ipaddress, port = 2485, bind = null) {
    const client = dgram.createSocket('udp4')
    // Lets the application close if this is the only socket still open
    client.unref()

    if (bind) {
      client.bind(port)
    }
    return client
  }
}

module.exports = {
  Logger,
  logLevels,
  logEndpoints,
}

// .:: Local moduling... ::.
if (typeof require != 'undefined' && require.main == module) {
  const bat = new Logger()

  bat.addEndpoint({
    name: 'base',
    type: logEndpoints.CONSOLE,
    logLevel: logLevels.INFO,
  })

  bat.addEndpoint({
    name: 'udp logger',
    type: logEndpoints.UDP,
    ipAddress: '127.0.0.1',
    port: 2485,
    logLevel: logLevels.UNGODLY,
  })

  bat.info('Testing')
  // bat.setLogLevel(logLevels.)
}
