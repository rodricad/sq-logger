'use strict';
const BaseLogger = require('./lib/base-logger');

let _instance = null;

class DummyLogger extends BaseLogger{

    debug(){
    }

    info(){
    }

    error(){
    }

    emerg(){
    }

    notify(){
    }

    static create(){
        if(!_instance)
            _instance = new DummyLogger();
        return _instance;
    }
}


module.exports = DummyLogger;
