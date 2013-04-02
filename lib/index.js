/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var log = require('./log'),
    fs = require('fs'),
    path = require('path'),
    args = require('./args'),
    api = require('./api'),
    builder = require('./builder'),
    find = require('./util').find;

exports.init = function() {
    var options = args.parse();

    if (options.version || options.help) {
        require('./help');
        return;
    }

    if (options['global-config']) {
        log.info('stealing the closest .grifter.json file');
        find(process.cwd(), '.grifter.json', function(err, file) {
            if (file) {
                log.info('woohoo, found a config here: ' + file);
                var json = JSON.parse(fs.readFileSync(file, 'utf8'));
                Object.keys(json).forEach(function(key) {
                    if (!args.has(key)) {
                        log.info('override config found for ' + key);
                        options[key] = json[key];
                    }
                });
            }
        });
    }

    if (options.github) {
        require('./github').init(options);
        return;
    }

    if (!options.gh_user || !options.gh_token) {
        log.err('You must have a github user and oauth token in your config..');
        log.err('Either in your .grifter.json or via an argument');
        log.error('configure grifter with: grifter --github');
    }

    log.info('preparing to steal your modules');

    api.config(options);

    log.info('fetching modules from the cdn queue');

    api.get('/cdn/queue', function(err, json) {
        if (json && json.count) {
            log.info('there are ' + json.count + ' items in the gallery queue for build: ' + json.buildtag);
            log.info('grifting the modules...');
            if (!args.has('output')) {
                options.output = path.join(process.cwd(), 'cdn_' + json.buildtag);
            }
            options.buildtag = json.buildtag;
            builder.process(options, json, function() {
                log.info('all done!');
            });
        }
    });

};
