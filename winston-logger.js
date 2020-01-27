'use strict';
const BaseLogger = require('./lib/base-logger');
const winston   = require('winston');

const os    = require('os');
const _     = require('lodash');
const util  = require('util');

const { createLogger, format, transports } = winston;
const { combine, timestamp, splat, printf, errors, simple } = format;
require('winston-daily-rotate-file');
require('winston-mail');

const Notifier = require('./lib/notifier');

const DEBUG = 'debug';
let _instance = null;

class WinstonLogger extends BaseLogger{

    /**
     *
     * @param opts
     * @param {Boolean=} opts.useHostname
     * @param {Object=}  opts.console
     * @param {Object=}  opts.console.enabled
     * @param {Object=}  opts.file
     * @param {Boolean}  opts.file.enabled
     * @param {Array}    opts.file.levels
     * @param {String}   opts.file.datePattern  e.g. 'YYYY-MM-DD'
     * @param {Boolean}  opts.file.zipped
     * @param {String}   opts.file.dirname
     * @param {String}   opts.file.maxSize  Maximum size of the file after which it will rotate. This can be a number of bytes, or units of kb, mb, and gb. If using the units, add 'k', 'm', or 'g' as the suffix. The units need to directly follow the number
     * @param {String}   opts.file.maxFiles Maximum number of logs to keep. If not set, no logs will be removed. This can be a number of files or number of days. If using days, add 'd' as the suffix
     * @param {Object}   opts.mail
     * @param {Boolean}  opts.mail.enabled
     * @param {String}   opts.mail.from
     * @param {String}   opts.mail.to
     * @param {String}   opts.mail.level
     * @param {Object}   opts.mail.smtp
     * @param {String}   opts.mail.smtp.host
     * @param {String}   opts.mail.smtp.port
     * @param {String}   opts.mail.smtp.username
     * @param {String}   opts.mail.smtp.password
     */
    constructor(opts){
        opts = opts || {};
        super();

        this.logger = createLogger({
            levels: BaseLogger.Levels,
            level:  opts.level || DEBUG,
            format: combine(
                timestamp(),
                // splat(),
                errors({ stack: true }),
                getFormat(opts.useHostname != null ? opts.useHostname : false)
            ),
            transports: []
        });

        process.on('uncaughtException', this.onUnhandledException.bind(this));
        process.on('unhandledRejection', this.onUnhandledRejection.bind(this));
        this.logger.on('finish', this.onFinish.bind(this));

        if(opts.console && opts.console.enabled){
            this.addConsole()
        }

        if(opts.file && opts.file.enabled){
            opts.file.levels = opts.file.levels || BaseLogger.DefaultLevels;
            for(let i=0; i<opts.file.levels.length; i++){
                let level = opts.file.levels[i];
                this.addFiles(opts.file, level);
            }
        }

        if(opts.mail && opts.mail.enabled){
            this.addMail(opts.mail);
        }

        this.notifierMap = new Map();
    }

    /**
     *
     * @param {Object} emailConfig
     * @param {String} emailConfig.from
     * @param {String} emailConfig.to
     * @param {String} emailConfig.level
     * @param {Object} emailConfig.smtp
     * @param {String} emailConfig.smtp.host
     * @param {String} emailConfig.smtp.port
     * @param {String} emailConfig.smtp.username
     * @param {String} emailConfig.smtp.password
     */
    addMail(emailConfig){
        var config = _.cloneDeep(emailConfig);
        config.unique = true;
        config.html = true;

        if(process.env.NODE_ENV === 'production')
            config.subject = util.format('[ERR] - {{msg}}');
        else
            config.subject = util.format('[ERR] %s - {{msg}}', process.env.NODE_ENV);

        this.logger.add(new transports.Mail(config));
    }

    addConsole(){
        this.logger.add(new transports.Console({ handleExceptions: true, handleRejections: true }));
    }


    /**
     * @param {Boolean} fileConfig.enabled
     * @param {Array}   fileConfig.levels
     * @param {String}  fileConfig.datePattern  e.g. 'YYYY-MM-DD'
     * @param {Boolean} fileConfig.zipped
     * @param {String}  fileConfig.dirname
     * @param {String}  fileConfig.maxSize  Maximum size of the file after which it will rotate. This can be a number of bytes, or units of kb, mb, and gb. If using the units, add 'k', 'm', or 'g' as the suffix. The units need to directly follow the number
     * @param {String}  fileConfig.maxFiles Maximum number of logs to keep. If not set, no logs will be removed. This can be a number of files or number of days. If using days, add 'd' as the suffix
     */
    addFiles(fileConfig, level){
        this.logger.add(new (winston.transports.DailyRotateFile)({
            filename:       level + '-%DATE%.log',
            datePattern:    fileConfig.datePattern || 'YYYY-MM-DD',
            zippedArchive:  fileConfig.zipped   == null ? false : fileConfig.zipped,
            maxSize:        fileConfig.maxSize  == null ? null  : fileConfig.maxSize,
            maxFiles:       fileConfig.maxFiles == null ? null  : fileConfig.maxFiles,
            level:          level,
            dirname:        fileConfig.dirname
        }));
    }


    /**
     *
     * @param msgAndArgs {...(String|Number|Object)} First send the logging string, then the variables to format
     */
    debug(...msgAndArgs){
        var message = util.format.apply(util, msgAndArgs);
        this.logger.debug(message);
    }

    /**
     *
     * @param msgAndArgs {...(String|Number|Object)} First send the logging string, then the variables to format
     */
    info(...msgAndArgs){
        var message = util.format.apply(util, msgAndArgs);
        this.logger.info(message);
    }

    /**
     *
     * @param msgAndArgs {...(String|Number|Object)} First send the logging string, then the variables to format
     */
    error(...msgAndArgs){
        var message = util.format.apply(util, msgAndArgs);
        this.logger.error(message);
    }

    /**
     *
     * @param msgAndArgs {...(String|Number|Object)} First send the logging string, then the variables to format
     */
    emerg(...msgAndArgs){
        var message = util.format.apply(util, msgAndArgs);
        this.logger.emerg(message);
    }

    /**
     * @param {Error} err
     */
    onUnhandledException(err) {
        // Logger has been already ended because of another unhandled exception or rejection
        if (this.logger.writable === false) {
            return;
        }
        this.notify('Unhandled Exception').steps(0, 1).msg('Unhandled Exception. Error: ', err);
    }

    /**
     * @param {Error} err
     */
    onUnhandledRejection(err) {
        // Logger has been already ended because of another unhandled exception or rejection
        if (this.logger.writable === false) {
            return;
        }
        this.notify('Unhandled Rejection').steps(0, 1).msg('Unhandled Rejection. Error: ', err);
    }

    onFinish() {
        process.exit(1);
    }

    end() {
        this.logger.end();
    }

    /**
     *
     * @param key {String}
     * @return {Notifier}
     */
    notify(key){
        let notifier = this.notifierMap.get(key);
        if(notifier)
            return notifier;

        notifier = new Notifier(this, key);
        this.notifierMap.set(key, notifier);
        return notifier;
    }


    /**
     *
     * @param opts
     * @param {Boolean=} opts.useHostname
     * @param {Object=}  opts.console
     * @param {Object=}  opts.console.enabled
     * @param {Object=}  opts.file
     * @param {Boolean}  opts.file.enabled
     * @param {Array}    opts.file.levels
     * @param {String}   opts.file.datePattern  e.g. 'YYYY-MM-DD'
     * @param {Boolean}  opts.file.zipped
     * @param {String}   opts.file.dirname
     * @param {String}   opts.file.maxSize  Maximum size of the file after which it will rotate. This can be a number of bytes, or units of kb, mb, and gb. If using the units, add 'k', 'm', or 'g' as the suffix. The units need to directly follow the number
     * @param {String}   opts.file.maxFiles Maximum number of logs to keep. If not set, no logs will be removed. This can be a number of files or number of days. If using days, add 'd' as the suffix
     * @param {Object}   opts.mail
     * @param {Boolean}  opts.mail.enabled
     * @param {String}   opts.mail.from
     * @param {String}   opts.mail.to
     * @param {String}   opts.mail.level
     * @param {Object}   opts.mail.smtp
     * @param {String}   opts.mail.smtp.host
     * @param {String}   opts.mail.smtp.port
     * @param {String}   opts.mail.smtp.username
     * @param {String}   opts.mail.smtp.password
     */
    static create(opts){
        if(!_instance)
            _instance = new WinstonLogger(opts);
        return _instance;
    }

    static reset(){
        _instance = null;
    }

}

const myFormat = printf(({ level, message, label, timestamp}) => {

    return `${timestamp} [${level}] ${message}`;
});

function getFormat(useHostname){
    return printf(({ level, message, label, timestamp}) => {
        let lev = level === 'info' ? 'info ' : level;
        if(useHostname)
            return `${timestamp} [${lev}] ${os.hostname} ${message}`;
        return `${timestamp} [${lev}] ${message}`;
    });
}

module.exports = WinstonLogger;
