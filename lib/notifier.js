'use strict';
const os    = require('os');
const util  = require('util');
const DEFAULT_FROM = 0;
const DEFAULT_EACH = 10;

class Notifier{

    /**
     *
     * @param logger {Logger}
     * @param key
     */
    constructor(logger, key){

        this.logger = logger;
        this.hostname = os.hostname();

        this._start = DEFAULT_FROM;
        this._each = DEFAULT_EACH;

        this.key    = key;
        this._count = 0;

        this._daily = {
            enabled:true,
            date: new Date()
        }
    }

    /**
     *
     * @param {Number} startOn
     * @param {Number} each
     * @return {Notifier}
     */
    steps(startOn, each){
        this._start = startOn;
        this._each  = each;
        return this;
    }

    /**
     *
     * @param eachCount {Number}
     * @return {Notifier}
     */
    start(startOn){
        this._start = startOn;
        return this;
    }

    /**
     *
     * @param {Number=} eachCount
     * @return {Notifier}
     */
    each(eachCount){
        this._each = eachCount === 0 || eachCount == null ? 1 : eachCount;
        return this;
    }

    /**
     *
     * @param {Boolean} enabled (default true)
     * @return {Notifier}
     */
    daily(enabled = true){
        this._daily.enabled = enabled;
        return this;
    }

    /**
     *
     * @param msgAndArgs {...(String|Number|Object)} First send the logging string, then the variables to format
     */
    msg(...msgAndArgs){
        if(this._daily.enabled)
            this.onDailyMessage();

        // TODO: This rules must be tested correctly!!
        if(this._count === this._start || (this._count % this._each === 0 && this._count !== 0 )){
            let prefixMsg = util.format('%s\n<br>%s<br>Notifier start:%s each:%s count:%s<br><pre>%s', this.key, this.hostname, this._start, this._each, this._count, msgAndArgs[0]);
            this.logger.emerg(prefixMsg, ...msgAndArgs.slice(1), '</pre>');
        }
        else{
            this.logger.error(...msgAndArgs)
        }
        this._count++;
    }

    /**
     *
     */
    onDailyMessage(){
        if(Notifier._isSameDate(this._daily.date, new Date()) === false){
            this._count = 0;
            this._daily.date = new Date();
        }
    }


    /**
     *
     * @param d1
     * @param d2
     * @return {boolean}
     * @private
     */
    static _isSameDate(d1, d2){
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth()       === d2.getMonth() &&
            d1.getDate()        === d2.getDate();

    }
}

module.exports = Notifier;