'use strict';

const BaseLogger = require('./lib/base-logger');
const Notifier = require('./lib/notifier');

let _instance = null;
let _notifier = null;

class DummyLogger extends BaseLogger{

    debug(){
    }

    info(){
    }

    error(){
    }

    emerg(){
    }

    /**
     * @param key {String}
     * @return {Notifier}
     */
    notify(key){
        if (_notifier == null) {
            _notifier = new Notifier(this, key);
        }
        return _notifier;
    }

    end(){

    }

    static create(){
        if(!_instance)
            _instance = new DummyLogger();
        return _instance;
    }
}


module.exports = DummyLogger;
