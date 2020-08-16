import dateformat from 'dateformat'
import dgram from 'dgram'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'

// .:: In the event of electron ::.
// Electron will be required when needed... however we need to set some gloabal variables for it to get used correctly.
var ipcRenderer: any //= require('electron')
var remote: any // = reuqire('electron')

/**
 * @description An enum representing the log levels associated with Kindling
 * @export
 * @enum {number}
 */
enum LogLevels {
  UNGODLY = -1000,
  INFO = 0,
  DEBUG = 10,
  WARN = 20,
  ERROR = 30,
  FAILURE = 50,
  GODLY = 1000,
}

// Fixing because I'm dumb
/** @deprecated */
export import logLevels = LogLevels
import { deprecate } from 'util'

/**
 * @description How often the log should rotate
 * @export
 * @enum {number}
 */
export enum logRotations {
  OFF = 0,
  HOURLY,
  DAILY,
  WEEKLY,
  MONTHLY,
  YEARLY,
}

/**
 * @description An interface describing what a log stream needs. Requires a logLevel, type, and name.
 * @export
 * @interface LogStream
 */
export interface LogStream {
  logLevel: LogLevels
  type: LogEndpoints
  name: string
  channel?: string
  rotating?: any
  filePath?: string
  fileName?: string
  ipAddress?: string
  port?: number
  udpBind?: boolean
  currentHour?: string
  currentDay?: string
  currentWeek?: string
  currentMonth?: string
  currentYear?: string
  customFunction?(logData: string): string
}

/**
 * @description An enum describing the different endpoints.
 * @export
 * @enum {number}
 */
export enum LogEndpoints {
  CONSOLE = 0,
  FILE = 1,
  UDP = 2,
  ELECTRON_CONSOLE = 3,
  CUSTOM = 99,
}

/**
 * @description The main Logger class.
 * @export
 * @class Logger
 * @extends {EventEmitter}
 */
export class Logger extends EventEmitter {
  loggers: LogStream[]
  udpClients: any
  fileLogs: any
  logLevel: LogLevels
  dateFormat: string
  isElectron: boolean
  selfLog: boolean
  logData: string = ''

  /**
   *Creates an instance of Logger.
   * @memberof Logger
   */
  constructor() {
    super()
    // A log stream is where the log info will go (ie console, text file, udp...) it should be open enough to accept pretty much anything
    this.loggers = []
    this.udpClients = {} // A place to store the udp clients
    this.fileLogs = {} // a place to store different files
    this.logLevel = LogLevels.INFO
    this.dateFormat = 'yyyy-mm-dd HH:MM:ss.l' // You can find formatting options here https://www.npmjs.com/package/dateformat
    this.isElectron = false
    this.selfLog = false
  }

  /**
   * @description Adds an endpoint to the logger.
   * @param {LogStream} logStream
   * @memberof Logger
   */
  addEndpoint(logStream: LogStream) {
    this.loggers.push(logStream)
    // TODO: add handling for Network logging here
    switch (logStream.type) {
      case LogEndpoints.UDP:
        this.udpClients[logStream.name] = this._createUdpClient(logStream.ipAddress!, logStream.port || 2485, logStream.udpBind || false)
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
    this.info(`New logger added:: Name: ${logStream.name}, Log Level: ${LogLevels[logStream.logLevel || this.logLevel]}, Type: ${LogLevels[logStream.logLevel || this.logLevel]}`)
  }

  /**
   * @description Sets the main log level of the logger. Anything Lower will not be logged.
   * @param {LogLevels} logLevel
   * @memberof Logger
   */
  setLogLevel(logLevel: LogLevels) {
    this.warn(`Log level changed to ${String(LogLevels[logLevel]).toUpperCase()}`)
    this.logLevel = logLevel
  }

  /**
   * @description Internal logging system for the logger. This is how everyhting gets out.
   * @private
   * @param {String} logMessage
   * @param {LogLevels} [logLevel=LogLevels.INFO]
   * @memberof Logger
   */
  private _log(logMessage: String, logLevel: LogLevels = LogLevels.INFO) {
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
        this.logData = `${date} ${[logLevel]}:: ${logMessage}`

        // Logger specifics
        // Loop through all of the loggers
        switch (activeLogger.type) {
          case LogEndpoints.CONSOLE:
            console.log(this.logData)
            break
          case LogEndpoints.ELECTRON_CONSOLE:
            // We're savvy enough to know we're using Electron, so lets just enable it
            if (!this.isElectron) {
              this._useElectron()
            }
            ipcRenderer.send(activeLogger.channel || 'log', this.logData)
            break

          case LogEndpoints.FILE:
            // File specifics
            let fullFilePath
            let fileName: string
            let filePath: string
            const now = new Date()
            switch (activeLogger.rotating) {
              case logRotations.OFF:
                break
              case logRotations.HOURLY:
                filePath = path.join(activeLogger.filePath!, `${dateformat(now, 'yyyy')}`, `${dateformat(now, 'mmmm')}`, `${dateformat(now, 'dd')}`)
                fileName = `${dateformat(now, 'yyyy-mm-dd-HH')}.log`
                break
              case logRotations.DAILY:
                filePath = path.join(activeLogger.filePath!, `${dateformat(now, 'yyyy')}`, `${dateformat(now, 'mmmm')}`)
                fileName = `${dateformat(now, 'yyyy-mm-dd ddd')}.log`
                break
              case logRotations.WEEKLY:
                filePath = path.join(activeLogger.filePath!, `${dateformat(now, 'yyyy')}`)
                fileName = `${dateformat(now, 'yyyy-W')}.log`
                break
              case logRotations.MONTHLY:
                filePath = path.join(activeLogger.filePath!, `${dateformat(now, 'yyyy')}`)
                fileName = `${dateformat(now, 'yyyy-mm')}.log`
                break
              case logRotations.YEARLY:
                filePath = path.join(activeLogger.filePath!, 'Years')
                fileName = `${dateformat(now, 'yyyy')}.log`
                break

              default:
                fullFilePath = path.join(activeLogger.filePath!, activeLogger.fileName!) || path.join('./', 'log.txt')
                break
            }

            const dataWithNewLines = this.logData + '\r'
            fullFilePath = path.join(filePath!, fileName!)

            try {
              if (fs.existsSync(fullFilePath)) {
                fs.appendFileSync(fullFilePath, dataWithNewLines)
              } else {
                fs.mkdir(filePath!, { recursive: true }, (err: any) => {
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
            activeLogger.customFunction!(this.logData)
            break
          default:
            console.log(Date.now(), 'Unknown type of logger', activeLogger.logLevel)
        }
      }
    })
  }

  /**
   * @description Logs to the ungoldy level. No real reson for this except to help balance out for the godly logger.
   * @param {String} logMessage
   * @memberof Logger
   */
  ungodly(logMessage: String) {
    this._log(logMessage, LogLevels.UNGODLY)
  }

  /**
   * @description Logs to the debug level
   * @param {String} logMessage
   * @memberof Logger
   */
  debug(logMessage: String) {
    this._log(logMessage, LogLevels.DEBUG)
  }

  /**
   * @description Logs to the info level
   * @param {String} logMessage
   * @memberof Logger
   */
  info(logMessage: String) {
    this._log(logMessage, LogLevels.INFO)
  }

  /**
   * @description Logs to the warn level
   * @param {String} logMessage
   * @memberof Logger
   */
  warn(logMessage: String) {
    this._log(logMessage, LogLevels.WARN)
  }

  /**
   * @description Logs to the error level
   * @param {String} logMessage
   * @memberof Logger
   */
  error(logMessage: String) {
    this._log(logMessage, LogLevels.ERROR)
  }

  /**
   * @description Logs to failure level
   * @param {String} logMessage
   * @memberof Logger
   */
  fail(logMessage: String) {
    this._log(logMessage, LogLevels.FAILURE)
  }

  /**
   * @description Logs to the godly level. This will log on all levels always.
   * @param {String} logMessage
   * @memberof Logger
   */
  godly(logMessage: String) {
    this._log(logMessage, LogLevels.UNGODLY)
    this._log(logMessage, LogLevels.DEBUG)
    this._log(logMessage, LogLevels.INFO)
    this._log(logMessage, LogLevels.WARN)
    this._log(logMessage, LogLevels.ERROR)
    // this._log(logMessage, LogLevels.GODLY) /* DONT DO THIS. DONT EVER DO THIS. FOR THE LOVE ALL THINGS HOLY DON'T. EVER. DO. THIS */
  }

  /**
   * @description Loads parts needed for electron projects
   * @private
   * @memberof Logger
   */
  private _useElectron() {
    this.isElectron = true
    ipcRenderer = require('electron').ipcRenderer
    remote = require('electron').remote
  }

  /**
   * @description Logging for the class itself.
   * @private
   * @param {string} data
   * @memberof Logger
   */
  private _logLocal(data: string) {
    if (this.selfLog) {
      console.log(data)
    }
  }

  /**
   * @description Creates a UDP client for a network logger
   * @private
   * @param {string} ipaddress
   * @param {number} [port=2485]
   * @param {boolean} [bind=false]
   * @returns {dgram.Socket}
   * @memberof Logger
   */
  private _createUdpClient(ipaddress: string, port: number = 2485, bind: boolean = false): dgram.Socket {
    const client = dgram.createSocket('udp4')
    // Lets the application close if this is the only socket still open
    client.unref()

    if (bind) {
      client.bind(port)
    }
    return client
  }

  /**
   * @description Sets the file parameters for a file logger.
   * @private
   * @param {string} filePath
   * @param {string} fileName
   * @memberof Logger
   * @deprecated may not be used anywhere?
  
   */
  private _setupFileParamters(filePath: string, fileName: string) {
    const fullFilePath = path.join(filePath, fileName) || path.join('./', 'log.txt')
    const dataWithNewLines = this.logData + '\r'
    fs.appendFileSync(fullFilePath, dataWithNewLines)
  }
}

module.exports = {
  Logger,
  logLevels /* Depricating soon */,
  LogLevels,
  LogEndpoints,
  logRotations,
}
