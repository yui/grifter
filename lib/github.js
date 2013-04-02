var osenv = require('osenv'),
    path = require('path'),
    fs = require('fs'),
    request = require('request'),
    log = require('./log'),
    util = require('./util');

var fetchToken = function(username, passwd, callback) {
    var scopes = 'user,repo,gist',
        body = JSON.stringify({
            //Adding date here because Github doesn't show it in the admin page
            note: 'grifter CLI access [' + (new Date()).toDateString() + ']',
            note_url: 'http://github.com/yui/grifter',
            scopes: scopes.split(',')
        }),
        auth = 'Basic ' + new Buffer(username + ':' + passwd).toString('base64');
    
    log.info('fetching oauth token for: ' + scopes);

    request.post({
        url: 'https://api.github.com/authorizations',
        body: body,
        headers: {
            'Content-Length': body.length,
            'Content-Type' : 'application/json',
            'User-Agent': 'grifter CLI tool',
            'Authorization': auth
        }
    }, function(err, res) {
        if (err) {
            log.bail(err);
        }
        var json = JSON.parse(res.body), token;
        if (json.message) {
            log.error(json.message);
        }
        if (!json.token) {
            console.log(json);
            log.bail('something bad happened, file a bug for it!');
        }
        token = json.token;
        log.info('received token, saving');
        callback(token);
    });
};

exports.init = function() {
    var configFile = path.join(osenv.home, '.grifter.json');
    util.find(process.cwd(), '.grifter.json', function(err, file) {
        if (file) {
            configFile = file;
        }
        
        util.prompt('GitHub User: ', function(username) {
           if (username) {
                log.warn('not recorded, passed directly to GitHub to get an oAuth token');
                util.prompt('Github Password: ', function(passwd) {
                    if (passwd) {
                        log.info('fetching token');
                        fetchToken(username, passwd, function(token) {
                            var config = require(configFile);
                            config.gh_user = username;
                            config.gh_token = token;
                            fs.writeFileSync(configFile, JSON.stringify(config, null, 4) + '\n', 'utf8');
                            log.info('token saved to: ' + configFile);
                        });
                    } else {
                        log.error('must provide a password');
                    }
                    
                }, true);
            } else {
                log.error('must provide a username');
            }
        });
    });
};
