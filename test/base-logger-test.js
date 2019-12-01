'use strict';

describe('Base Logger Test', function () {

    const chai   = require('chai');
    const assert = require('chai').assert;
    const expect = require('chai').expect;
    const Constants = require('../lib/constants');
    const BaseLogger = require('../lib/base-logger');

    before(() => {

    });

    it('1. Instance Base Logger. Validate debug is not implemented', function () {
        let baseLogger = new BaseLogger();
        return baseLoggerExceptionTest(baseLogger.debug, {
            code:Constants.NOT_IMPLEMENTED
        })
    });


    it('2. Instance Base Logger. Validate info is not implemented', function () {
        let baseLogger = new BaseLogger();
        return baseLoggerExceptionTest(baseLogger.info, {
            code:Constants.NOT_IMPLEMENTED
        })
    });

    it('3. Instance Base Logger. Validate err is not implemented', function () {
        let baseLogger = new BaseLogger();
        return baseLoggerExceptionTest(baseLogger.error, {
            code:Constants.NOT_IMPLEMENTED
        })
    });

    it('4. Instance Base Logger. Validate emerg is not implemented', function () {
        let baseLogger = new BaseLogger();
        return baseLoggerExceptionTest(baseLogger.emerg, {
            code:Constants.NOT_IMPLEMENTED
        })
    });


    it('5. Instance Base Logger. Validate notify is not implemented', function () {
        let baseLogger = new BaseLogger();
        return baseLoggerExceptionTest(baseLogger.notify, {
            code:Constants.NOT_IMPLEMENTED
        })
    });

    function baseLoggerExceptionTest(method, expected){

        return Promise.resolve()
        .then(() => {
            return method();
        })
        .then(()=>{
            assert(false, 'This must not been executed');
        })
        .catch((err) => {
            console.log(err);
            expect(err.code).to.equals(expected.code);
        })

    }
});