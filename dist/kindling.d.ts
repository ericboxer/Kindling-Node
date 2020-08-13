/// <reference types="node" />
import dgram from 'dgram';
import { EventEmitter } from 'events';
/**
 * @description
 * @export
 * @enum {number}
 */
declare enum logLevels {
    UNGODLY = -1000,
    INFO = 0,
    DEBUG = 10,
    WARN = 20,
    ERROR = 30,
    FAILURE = 50,
    GODLY = 1000
}
interface LogStream {
    logLevel: logLevels;
    type: LogEndpoints;
    name: string;
    channel?: string;
    rotating?: any;
    filePath?: string;
    fileName?: string;
    ipAddress?: string;
    port?: number;
    udpBind?: boolean;
    currentHour?: string;
    currentDay?: string;
    currentWeek?: string;
    currentMonth?: string;
    currentYear?: string;
    customFunction?(logData: string): string;
}
declare enum LogEndpoints {
    CONSOLE = 0,
    FILE = 1,
    UDP = 2,
    ELECTRON_CONSOLE = 3,
    CUSTOM = 99
}
export declare class Logger extends EventEmitter {
    loggers: LogStream[];
    udpClients: any;
    fileLogs: any;
    logLevel: logLevels;
    dateFormat: string;
    isElectron: boolean;
    selfLog: boolean;
    logData: string;
    constructor(options?: {});
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
    addEndpoint(logStream: LogStream): void;
    /**
     * @description The base logger. You are better off using one of the log levels instead
     * @param {String} logMessage [var x = 1]
     * @param {logLevels} logLevel [logLevels.DEBUG]
    
     */
    private log;
    /**
     * @description send an info message to the logger
     * @param {string} logMessage
     * @memberof Logger
     */
    info(logMessage: String): void;
    /**
     * @description Send a debug message to the logger
     * @param {string} logMessage
     * @memberof Logger
     */
    debug(logMessage: String): void;
    /**
     * @description Send a warning to the logger
     * @param {string} logMessage
     * @memberof Logger
     */
    warn(logMessage: String): void;
    /**
     * @description Send a error to the logger
     * @param {string} logMessage
     * @memberof Logger
     */
    error(logMessage: String): void;
    /**
     * @description Send a GODLY message to the logger
     * @param {string} logMessage
     * @memberof Logger
     */
    godly(logMessage: String): void;
    /**
     * @description Changes the main log level
     * @param {logLevels} logLevel
     * @memberof Logger
     */
    setLogLevel(logLevel: logLevels): void;
    /**
     * This enables ussage in an electron app.
     */
    useElectron(): void;
    /**
     * @deprecated Use Boxtoolsjs
     * @description Returns the key name given a list and vaule
     * @param {*} object
     * @param {*} value
     * @returns String of the
     * @memberof Logger
     */
    /**
     *
     * @param {string} data
     */
    _logLocal(data: string): void;
    _createUdpClient(ipaddress: string, port?: number, bind?: boolean): dgram.Socket;
    _setupFileParamters(filePath: string, fileName: string): void;
}
export {};
//# sourceMappingURL=kindling.d.ts.map