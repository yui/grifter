var spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path'),
    yogi = path.join(__dirname, '../../', 'node_modules', '.bin', 'yogi');

exports.yogi = function(options, blob, done) {
    var cwd = path.join(options.output, 'src', options.module.module),
        y = spawn(yogi, [
            'build',
            '--test',
            '--istanbul',
            '--coverage',
            '--replace-version=' + options.buildtag,
            '--cssproc',
            options.cssproc,
            '-t',
            '120',
            '--outfile',
            './logs/tests.json',
            '--json'
        ], {
            cwd: cwd
        }),
        logs = {
            stdout: [],
            stderr: []
        };

    y.stdout.on('data', function(d) {
        logs.stdout.push(d.toString());
    });

    y.stderr.on('data', function(d) {
        logs.stderr.push(d.toString());
    });

    y.on('exit', function() {
        var reg = new RegExp(options.output, 'gim');

        fs.writeFile(path.join(cwd, 'logs', 'yogi.stdout.log'), logs.stdout.join('').replace(reg, ''), 'utf8', function() {
            fs.writeFile(path.join(cwd, 'logs', 'yogi.stderr.log'), logs.stderr.join('').replace(reg, ''), 'utf8', function() {
                fs.readFile(path.join(cwd, 'logs', 'tests.json'), 'utf8', function(err, data) {
                    if (data) {
                        var json = JSON.parse(data);
                        if (json.coverage) {
                            Object.keys(json.coverage).forEach(function(file) {
                                if (json.coverage[file].code) {
                                    delete json.coverage[file].code;
                                }
                            });
                            fs.writeFile(path.join(cwd, 'logs', 'tests.json'), JSON.stringify(json, null, 4), 'utf8', function() {
                                done(null, blob);
                            });
                        } else {
                            done(null, blob);
                        }
                    } else {
                        done(null, blob);
                    }
                });
            });
        });
    });
};
