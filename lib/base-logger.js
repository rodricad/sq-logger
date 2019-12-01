'use strict';
const Exception = require('sq-toolkit/exception');
const Constants = require('./constants');

class BaseLogger{

    constructor(){

    }

    debug(){
        throw new Exception(Constants.NOT_IMPLEMENTED);
    }

    info(){
        throw new Exception(Constants.NOT_IMPLEMENTED);
    }

    error(){
        throw new Exception(Constants.NOT_IMPLEMENTED);
    }

    emerg(){
        throw new Exception(Constants.NOT_IMPLEMENTED);
    }

    notify(){
        throw new Exception(Constants.NOT_IMPLEMENTED);
    }
}

BaseLogger.Levels = {
    emerg: 0,
    alert: 1,
    crit: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7
};

BaseLogger.DefaultLevels = [
    'debug',
    'info',
    'error',
    'emerg'
];

module.exports = BaseLogger;
