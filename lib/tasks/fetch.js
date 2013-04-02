
var request = require('request'),
    log = require('../log');

exports.fetch = function(options, blob, done) {
    var opts = blob.result.options,
        path = '/repos/' + options.github + '/' + options.repo + '/git/trees/' + options.sha1 + '?recursive=1';

    request({
        url: 'https://api.github.com' + path,
        headers: {
            'Content-Type' : 'application/json',
            'User-Agent': 'grifter CLI tool',
            'Authorization': 'bearer ' + opts.gh_token
        },
        json: true
    }, function(err, res) {
        if (res.body.message) {
            log.bail(res.body.message);
        }
        var info = {
            module: options,
            tree: res.body
        };
        done(null, new blob.constructor(info, blob));
    });
};


