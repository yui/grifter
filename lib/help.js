var log = require('./log');

var version = require('../package.json').version;
var args = require('./args').parse();
var log = require('./log');

var http = require('http');
var request;
var latest;

if (args.version) {
    process.on('uncaughtException', function () {
        console.log(version);
        process.exit(0);
    });
    try {
        request = http.get('http://registry.npmjs.org/grifter/latest', function (res) {
            var c = '';
            res.on('data', function (chunk) {
                c += chunk;
            });
            res.on('end', function () {
                var json = JSON.parse(c);
                latest = json.version;
                if (version < latest) {
                    console.log(log.color('!!!WARNING!!!', 'red'));
                    console.log(log.color('your version ' + version + ' is out of date, the latest available version is ' + latest, 'red'));
                    console.log(log.color('update with: npm -g install grifter', 'blue'));
                    process.exit(1);
                }
            });
        }).on('error', function () {
            console.log(version);
            process.exit(0);
        });
        setTimeout(function () {
            request.abort();
            console.log(version);
            process.exit(0);
        }, 500);
    } catch (e) {
        console.log(version);
        process.exit(0);
    }
}

if (args.help) {
    console.log(log.color('grifter steals your gallery modules and builds them', 'magenta') + log.color('@' + version, 'white'));
    console.log('');
    console.log('   -v/--version            show version');
    console.log('   -h/--help               show this stuff');
    console.log('   --no-global-config      Do not search for a .grifter.json file up the working path');
    process.exit(0);
}

