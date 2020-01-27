'use strict';

describe('Winston Logger', function () {

    const chai  = require('chai');
    const expect = require('chai').expect;
    const tk    = require('timekeeper');
    const sinon = require('sinon');
    const Promise = require('bluebird');

    const Logger = require('../winston-logger');
    const mkdirp = require('mkdirp');
    const fsExtra = require('fs-extra');


    after(() => {
        tk.reset();
    })

    describe('Test File Log. Use fs to read output files (include rotation)', () => {

        const DIR = './test/tmp/winston-logger';

        beforeEach(()=>{
            return fsExtra.remove(DIR)
            .then(() => {
                return fsExtra.ensureDir(DIR)
            })
            .then(()=>{
                Logger.reset();
            });

        });

        after(()=>{
            return fsExtra.remove(DIR);
        });

        it('1. Log in 4 levels. Expect Debug has all logs, info all but debug, error has error and emerg and emerg only emergency log.', function () {
            tk.freeze('2019-10-10T15:00:00.000Z');
            const DEBUG_LINE = '2019-10-10T15:00:00.000Z [debug] Here is the debug message\n';
            const INFO_LINE = '2019-10-10T15:00:00.000Z [info ] Here is the info message\n';
            const ERROR_LINE = '2019-10-10T15:00:00.000Z [error] Here is the error message\n';
            const EMERG_LINE = '2019-10-10T15:00:00.000Z [emerg] Here is the emergency message\n';

            let logger = Logger.create({
                file:{
                    enabled:true,
                    maxSize:'1k',
                    dirname:DIR
                }
            });

            logger.debug('Here is the debug message');
            logger.info('Here is the info message');
            logger.error('Here is the error message');
            logger.emerg('Here is the emergency message');

            return Promise.delay(100)
            .then(() => {
                return Promise.props({
                    debug: fsExtra.readFile(DIR + '/debug-2019-10-10.log'),
                    info: fsExtra.readFile(DIR + '/info-2019-10-10.log'),
                    error: fsExtra.readFile(DIR + '/error-2019-10-10.log'),
                    emerg: fsExtra.readFile(DIR + '/emerg-2019-10-10.log'),
                })
            })
            .then((res) => {
                expect(res.debug.toString()).to.equals(DEBUG_LINE + INFO_LINE + ERROR_LINE + EMERG_LINE);
                expect(res.info.toString()).to.equals(INFO_LINE + ERROR_LINE + EMERG_LINE);
                expect(res.error.toString()).to.equals(ERROR_LINE + EMERG_LINE);
                expect(res.emerg.toString()).to.equals(EMERG_LINE);
            })

        });


        it('2. Log in debug leevel 100 char per line. Expect two files are created. One with 50KB (51.3KB exactly) and the other one with less than 50K', ()=>{
            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = Logger.create({
                file:{
                    enabled:true,
                    maxSize:'50k',
                    dirname:DIR
                }
            });

            for(let i=0; i<1000; i++){
                // This will generate 131Kb.
                // by 50K per file, it is 3 files, two of 50KB and one of 31KB
                logger.debug('Logging 100 characters for each line. The goal is rotate file 100c');
            }

            return Promise.delay(100)
            .then(() => {
                return Promise.props({
                    fileList:fsExtra.readdir(DIR),
                    debugFile:fsExtra.readFile(DIR + '/debug-2019-10-10.log'),
                    fsStats:fsExtra.stat(DIR + '/debug-2019-10-10.log')

                })
            })
            .then((props) =>{
                let debugFiles = [];
                for(let i=0; i<props.fileList.length; i++){
                    if(props.fileList[i].startsWith('debug-'))
                        debugFiles.push(props.fileList[i])
                }
                expect(debugFiles).to.length(2);
                expect(debugFiles).to.eqls([
                    'debug-2019-10-10.log',
                    'debug-2019-10-10.log.1',
                ]);

                expect(props.debugFile.toString().split('\n').length).to.equals(514);
                expect(props.fsStats.size).to.equals(51300);
            });

        });

    })

    describe('Test Notify Log. Sinon on SMTP/Emergency', () => {
        const winstonMail = require('winston-mail');
        const emailjs = require('emailjs')

        beforeEach(() => {
            Logger.reset();
        });

        it('1. Expect one message with startOn 0 each 0 generates one emergency email.', function () {
            let smtpStub = sinon.stub(emailjs.server.Client.prototype, 'send').callsFake(() => {
                return Promise.resolve();
            });

            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = createMailLogger();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            logger.notify('Subject').start(0).each(0).msg('Send Email');

            return Promise.delay(100)
            .then(() => {
                expect(smtpStub.calledOnce).to.equals(true);
                expect(smtpStub.args[0][0].text).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:0 each:1 count:0<br><pre>Send Email </pre>');
            })
            .finally(() => {
                smtpStub.restore();
            })
        });

        it('2. Expect two message with startOn 0 each 0 generates one emergency email.', function () {
            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = createMailLogger();
            let emergStub = getEmergencyStub();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            logger.notify('Subject').start(0).each(1).msg('Send Email');
            logger.notify('Subject').start(0).each(1).msg('Send Second Email');

            return Promise.delay(100)
            .then(() => {
                expect(emergStub.calledTwice).to.equals(true);
                expect(emergStub.args[0][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:0 each:1 count:0<br><pre>Send Email');
                expect(emergStub.args[1][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:0 each:1 count:1<br><pre>Send Second Email');
            })
            .finally(() => {
                emergStub.restore();
            })
        });

        it('3. Expect three messages. First and third generates emergency email. Second one is error log.', function () {
            tk.freeze('2019-10-10T15:00:00.000Z');

            let logger = createMailLogger();
            let emergStub = getEmergencyStub();
            let errorStub = getErrorStub();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            logger.notify('Subject').start(0).each(2).msg('Send Email');
            logger.notify('Subject').start(0).each(2).msg('Log on Error');
            logger.notify('Subject').start(0).each(2).msg('Send Second Email');

            return Promise.delay(100)
            .then(() => {
                expect(emergStub.callCount).to.equals(2);
                expect(errorStub.callCount).to.equals(1);
                expect(emergStub.args[0][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:0 each:2 count:0<br><pre>Send Email');
                expect(emergStub.args[1][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:0 each:2 count:2<br><pre>Send Second Email');
                expect(errorStub.args[0][0]).to.equals('Log on Error');
            })
            .finally(() => {
                emergStub.restore();
                errorStub.restore();
            })
        });

        it('4. Run Notify with Start 5 each 5, and send 15 messages. Expect only 2 Emergency were sent. ', () =>{
            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = createMailLogger();
            let emergStub = getEmergencyStub();
            let errorStub = getErrorStub();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            for (let i = 0; i < 15; i++) {
                logger.notify('Subject').start(5).each(5).msg('Test message %s', i);
            }

            return Promise.delay(100)
            .then(() => {
                expect(emergStub.args[0][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:5 each:5 count:5<br><pre>Test message %s');
                expect(emergStub.args[0][1]).to.equals(5);
                expect(emergStub.args[0][2]).to.equals('</pre>');
                expect(emergStub.args[1][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:5 each:5 count:10<br><pre>Test message %s');
                expect(emergStub.args[1][1]).to.equals(10);
                expect(emergStub.args[1][2]).to.equals('</pre>');

                expect(emergStub.callCount).to.equals(2);
                expect(errorStub.callCount).to.equals(13);
            })
            .finally(() => {
                emergStub.restore();
                errorStub.restore();
            })


        });


        it('5. With startOn 0 and a  high "each", Log twice today. Expect only one call emergency. Then, go to next day. Expect first notifier is an emergency email ', () => {
            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = createMailLogger();
            let emergStub = getEmergencyStub();
            let errorStub = getErrorStub();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            logger.notify('Subject').start(0).each(100).msg('Test message');
            logger.notify('Subject').start(0).each(100).msg('Test message');
            logger.notify('Subject').start(0).each(100).msg('Test message');

            tk.freeze('2019-10-11T15:00:00.000Z');
            logger.notify('Subject').start(0).each(100).msg('Test message');
            logger.notify('Subject').start(0).each(100).msg('Test message');
            logger.notify('Subject').start(0).each(100).msg('Test message');


            return Promise.delay(100)
            .then(() => {
                expect(emergStub.callCount).to.equals(2);
                expect(errorStub.callCount).to.equals(4);
            })
            .finally(() => {
                emergStub.restore();
                errorStub.restore();
                tk.reset();
            })


        });

        it('6. Run Notify using steps(5, 5) with Start 5 each 5, and send 15 messages. Expect only 2 Emergency were sent. ', () =>{
            tk.freeze('2019-10-10T15:00:00.000Z');
            let logger = createMailLogger();
            let emergStub = getEmergencyStub();
            let errorStub = getErrorStub();

            // Mock up hostname
            logger.notify('Subject').hostname = '_HOSTNAME_';

            for (let i = 0; i < 15; i++) {
                logger.notify('Subject').steps(5,5).msg('Test message %s', i);
            }

            return Promise.delay(100)
            .then(() => {
                expect(emergStub.args[0][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:5 each:5 count:5<br><pre>Test message %s');
                expect(emergStub.args[0][1]).to.equals(5);
                expect(emergStub.args[0][2]).to.equals('</pre>');
                expect(emergStub.args[1][0]).to.equals('Subject\n<br>_HOSTNAME_<br>Notifier start:5 each:5 count:10<br><pre>Test message %s');
                expect(emergStub.args[1][1]).to.equals(10);
                expect(emergStub.args[1][2]).to.equals('</pre>');

                expect(emergStub.callCount).to.equals(2);
                expect(errorStub.callCount).to.equals(13);
            })
            .finally(() => {
                emergStub.restore();
                errorStub.restore();
            })


        });


        function createMailLogger(){
            return Logger.create({
                mail:{
                    enabled:true,
                    level:'emerg',
                    host:'smtp.example.org',
                    username:'user',
                    password: 'password',
                    from: 'Winston Test <postmaster+winston@example.com>',
                    to: 'admin@example.io'
                }
            });
        }

        function getEmergencyStub(){
            return sinon.stub(Logger.prototype, 'emerg').callsFake(() => {
                return Promise.resolve();
            });
        }

        function getErrorStub(){
            return sinon.stub(Logger.prototype, 'error').callsFake(() => {
                return Promise.resolve();
            });
        }

    })



});