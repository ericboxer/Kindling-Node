'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Logger = void 0
const dateformat = require('dateformat')
const dgram = require('dgram')
const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')
// import boxTools from 'boxtoolsjs'
// .:: In the event of electron ::.
// Electron will be required when needed... however we need to set some gloabal variables for it to get used correctly.
var ipcRenderer //= require('electron')
var remote // = reuqire('electron')
/**
 * @description
 * @export
 * @enum {number}
 */
var logLevels
;(function (logLevels) {
  logLevels[(logLevels['UNGODLY'] = -1000)] = 'UNGODLY'
  logLevels[(logLevels['INFO'] = 0)] = 'INFO'
  logLevels[(logLevels['DEBUG'] = 10)] = 'DEBUG'
  logLevels[(logLevels['WARN'] = 20)] = 'WARN'
  logLevels[(logLevels['ERROR'] = 30)] = 'ERROR'
  logLevels[(logLevels['FAILURE'] = 50)] = 'FAILURE'
  logLevels[(logLevels['GODLY'] = 1000)] = 'GODLY'
})(logLevels || (logLevels = {}))
/**
 * @description How often the log file should be rotated.
 * @enum {number}
 */
var logRotations
;(function (logRotations) {
  logRotations[(logRotations['OFF'] = 0)] = 'OFF'
  logRotations[(logRotations['HOURLY'] = 1)] = 'HOURLY'
  logRotations[(logRotations['DAILY'] = 2)] = 'DAILY'
  logRotations[(logRotations['WEEKLY'] = 3)] = 'WEEKLY'
  logRotations[(logRotations['MONTHLY'] = 4)] = 'MONTHLY'
  logRotations[(logRotations['YEARLY'] = 5)] = 'YEARLY'
})(logRotations || (logRotations = {}))
var _dayMappings = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
var LogEndpoints
;(function (LogEndpoints) {
  LogEndpoints[(LogEndpoints['CONSOLE'] = 0)] = 'CONSOLE'
  LogEndpoints[(LogEndpoints['FILE'] = 1)] = 'FILE'
  LogEndpoints[(LogEndpoints['UDP'] = 2)] = 'UDP'
  LogEndpoints[(LogEndpoints['ELECTRON_CONSOLE'] = 3)] = 'ELECTRON_CONSOLE'
  LogEndpoints[(LogEndpoints['CUSTOM'] = 99)] = 'CUSTOM'
})(LogEndpoints || (LogEndpoints = {}))
class Logger extends EventEmitter {
  constructor(options = {}) {
    super()
    this.logData = ''
    // A log stream is where the log info will go (ie console, text file, udp...) it should be open enough to accept pretty much anything
    this.loggers = []
    this.udpClients = {} // A place to store the udp clients
    this.fileLogs = {} // a place to store different files
    this.logLevel = logLevels.INFO
    this.dateFormat = 'yyyy-mm-dd HH:MM:ss.l' // You can find formatting options here https://www.npmjs.com/package/dateformat
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
  /**
   * @description Adds a logger end point to the log class
   * @param {LogStream} logStream
   * @memberof Logger
   */
  addEndpoint(logStream) {
    this.loggers.push(logStream)
    // TODO: add handling for Network logging here
    switch (logStream.type) {
      case LogEndpoints.UDP:
        this.udpClients[logStream.name] = this._createUdpClient(logStream.ipAddress, logStream.port || 2485, logStream.udpBind || false)
        break
      case LogEndpoints.FILE:
        const date = new Date()
        logStream.currentHour = dateformat(date, 'HH')
        logStream.currentDay = dateformat(date, 'dd')
        logStream.currentWeek = dateformat(date, 'W')
        logStream.currentMonth = dateformat(date, 'mm')
        logStream.currentYear = dateformat(date, 'yyyy')
        break
      default:
        break
    }
    this.info(`New logger added:: Name: ${logStream.name}, Log Level: ${logLevels[logStream.logLevel || this.logLevel]}, Type: ${logLevels[logStream.logLevel || this.logLevel]}`)
  }
  /**
     * @description The base logger. You are better off using one of the log levels instead
     * @param {String} logMessage [var x = 1]
     * @param {logLevels} logLevel [logLevels.DEBUG]
    
     */
  log(logMessage, logLevel = logLevels.INFO) {
    this.loggers.forEach((logger) => {
      const activeLogger = logger
      const shouldLog = logLevel >= activeLogger.logLevel && logLevel >= this.logLevel
      // For logging the logger... weird, right?
      this._logLocal(`Active logger: ${activeLogger}`)
      this._logLocal(`Log Level: ${this.logLevel}`)
      this._logLocal(`Local Log Level: ${logLevel}`)
      this._logLocal(`Should log: ${shouldLog}`)
      if (shouldLog) {
        // Build out the data to log
        const now = new Date()
        const date = dateformat(now, this.dateFormat)
        this.logData = `${date} ${logLevels[logLevel]}:: ${logMessage}`
        // this.logData = `${date} ${this._getKeyByValue(logLevels, String(logLevel)).toLocaleUpperCase()}:: ${logMessage}`
        // Logger specifics
        // Loop through all of the loggers
        switch (activeLogger.type) {
          case LogEndpoints.CONSOLE:
            console.log(this.logData)
            break
          case LogEndpoints.ELECTRON_CONSOLE:
            // We're savvy enough to know we're using Electron, so lets just enable it
            if (!this.isElectron) {
              this.useElectron()
            }
            ipcRenderer.send(activeLogger.channel || 'log', this.logData)
            break
          case LogEndpoints.FILE:
            // console.log(activeLogger)
            // File specifics
            let fullFilePath
            let fileName
            let filePath
            const now = new Date()
            switch (activeLogger.rotating) {
              case logRotations.OFF:
                break
              case logRotations.HOURLY:
                filePath = path.join(activeLogger.filePath, `${dateformat(now, 'yyyy')}`, `${dateformat(now, 'mmmm')}`, `${dateformat(now, 'dd')}`)
                fileName = `${dateformat(now, 'yyyy-mm-dd-HH')}.log`
                break
              case logRotations.DAILY:
                filePath = path.join(activeLogger.filePath, `${dateformat(now, 'yyyy')}`, `${dateformat(now, 'mmmm')}`)
                fileName = `${dateformat(now, 'yyyy-mm-dd ddd')}.log`
                break
              case logRotations.WEEKLY:
                filePath = path.join(activeLogger.filePath, `${dateformat(now, 'yyyy')}`)
                fileName = `${dateformat(now, 'yyyy-W')}.log`
                break
              case logRotations.MONTHLY:
                filePath = path.join(activeLogger.filePath, `${dateformat(now, 'yyyy')}`)
                fileName = `${dateformat(now, 'yyyy-mm')}.log`
                break
              case logRotations.YEARLY:
                filePath = path.join(activeLogger.filePath, 'Years')
                fileName = `${dateformat(now, 'yyyy')}.log`
                break
              default:
                // console.log('not created!')
                fullFilePath = path.join(activeLogger.filePath, activeLogger.fileName) || path.join('./', 'log.txt')
                break
            }
            const dataWithNewLines = this.logData + '\r'
            fullFilePath = path.join(filePath, fileName)
            try {
              if (fs.existsSync(fullFilePath)) {
                fs.appendFileSync(fullFilePath, dataWithNewLines)
              } else {
                fs.mkdir(filePath, { recursive: true }, (err) => {
                  console.log(err)
                })
                fs.writeFileSync(fullFilePath, dataWithNewLines, { flag: 'wx' })
              }
            } catch (error) {}
            break
          case LogEndpoints.UDP:
            const bufferedMessage = Buffer.from(this.logData)
            this.udpClients[activeLogger.name].send(bufferedMessage, activeLogger.port, activeLogger.ipAddress)
            break
          case LogEndpoints.CUSTOM:
            activeLogger.customFunction(this.logData)
            break
          default:
            console.log(Date.now(), 'Unknown type of logger', activeLogger.logLevel)
        }
      }
    })
  }
  /**
   * @description send an info message to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  info(logMessage) {
    this.log(logMessage, logLevels.INFO)
  }
  /**
   * @description Send a debug message to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  debug(logMessage) {
    this.log(logMessage, logLevels.DEBUG)
  }
  /**
   * @description Send a warning to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  warn(logMessage) {
    this.log(logMessage, logLevels.WARN)
  }
  /**
   * @description Send a error to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  error(logMessage) {
    this.log(logMessage, logLevels.ERROR)
  }
  /**
   * @description Send a GODLY message to the logger
   * @param {string} logMessage
   * @memberof Logger
   */
  godly(logMessage) {
    this.log(logMessage, logLevels.GODLY)
  }
  // TODO: Exclude anything other than whats in the loglevel
  /**
   * @description Changes the main log level
   * @param {logLevels} logLevel
   * @memberof Logger
   */
  setLogLevel(logLevel) {
    this.warn(`Log level changed to ${String(logLevels[logLevel]).toUpperCase()}`)
    // this.warn(`Log level changed to ${boxTools.ListTools.getKeyByValue(logLevels, logLevel).toUpperCase()}`)
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
  // _getKeyByValue(object: Object, value: string): string {
  //   return Object.keys(object).find((key) => object[key] === value)
  // }
  /**
   *
   * @param {string} data
   */
  _logLocal(data) {
    if (this.selfLog) {
      console.log(data)
    }
  }
  _createUdpClient(ipaddress, port = 2485, bind = false) {
    const client = dgram.createSocket('udp4')
    // Lets the application close if this is the only socket still open
    client.unref()
    if (bind) {
      client.bind(port)
    }
    return client
  }
  _setupFileParamters(filePath, fileName) {
    const fullFilePath = path.join(filePath, fileName) || path.join('./', 'log.txt')
    const dataWithNewLines = this.logData + '\r'
    fs.appendFileSync(fullFilePath, dataWithNewLines)
  }
}
exports.Logger = Logger
module.exports = {
  Logger,
  logLevels,
  LogEndpoints,
  logRotations,
}
// .:: Local moduling... ::.
if (typeof require != 'undefined' && require.main == module) {
  const bat = new Logger()
  bat.addEndpoint({
    name: 'base',
    type: LogEndpoints.CONSOLE,
    logLevel: logLevels.INFO,
  })
  bat.addEndpoint({
    name: 'udp logger',
    type: LogEndpoints.UDP,
    ipAddress: '127.0.0.1',
    port: 2485,
    logLevel: logLevels.UNGODLY,
  })
  bat.addEndpoint({
    name: 'rotating file',
    type: LogEndpoints.FILE,
    filePath: './testLogs',
    fileName: 'testlog.log',
    logLevel: logLevels.INFO,
    rotating: logRotations.DAILY,
  })
  bat.addEndpoint({
    name: 'rotating file',
    type: LogEndpoints.FILE,
    filePath: './testLogs',
    fileName: 'testlog.log',
    logLevel: logLevels.INFO,
    rotating: logRotations.HOURLY,
  })
  setInterval(() => {
    bat.info('Testing')
  }, 1000)
  setInterval(() => {
    bat.error('test error')
  }, 1500)
}
