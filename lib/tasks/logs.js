var path = require('path'),
    rimraf = require('rimraf'),
    mkdirp = require('mkdirp');

exports.logs = function(options, blob, done) {
    var logDir = path.join(options.output, 'src', options.module.module, 'logs');

    rimraf(logDir, function() {
        mkdirp(logDir, function() {
            done(null, blob);
        });
    });
    
};


