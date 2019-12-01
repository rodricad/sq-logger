**SQ Logger**

Require:

* Default Logger:

        const logger = require('sq-logger').create(loggerConfiguration);
    
* Dummy Logger to be used on external packages if logger is not initialized
        
        const dummyLogger = require('sq-logger/dummy-logger').create();  

Methods:
 * debug
 * info
 * error
 * emerg
 * notify
 
_Notify_
  * logger.notify(KEY).start().each().msg();
  * logger.notify(KEY).steps(startOn, each).msg();
  
_Configuration_

    {
        useHostname: false,
        console: {
            enabled: true
        },
        file: {
            enabled: true,
            levels: ['debug', info', 'error', 'emerg'], // (default)
            maxSize: '100k'
        },
        mail: {
            enabled: true,
            level: 'emerg',
            host: 'smtp.mailserver.org',
            username: 'username',
            password: 'pass',
            from: 'From Text <postmaster+winston@example.com>',
            to: 'recipient@example.com'
        }
    }  
