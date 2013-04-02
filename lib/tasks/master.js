
var request = require('request'),
    tar = require('tar'),
    zlib = require('zlib'),
    log = require('../log');

exports.master = function(options, blob, done) {
    var opts = blob.result.options;

    if (opts.master) {
        log.info('fetching ' + opts.master);
        request.get({
            url: opts.master,
            headers: {
                'User-Agent': 'grifter CLI tool'
            }
        }, function() {
            log.info('done fetching..');
            done(null, blob);
        }).pipe(zlib.createGunzip(tar.Extract({ path: opts.output })));

    } else {
        log.log('skipping master download');
        done(null, blob);
    }

};
