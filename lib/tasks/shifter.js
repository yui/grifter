
var spawn = require('child_process').spawn,
    fs = require('fs'),
    path = require('path'),
    exists = fs.existsSync || path.existsSync,
    mkdirp = require('mkdirp'),
    log = require('../log');


var build = function(mod, cwd, callback) {
    log.info('shifting for ' + mod);
    var s = path.join(__dirname, '../../', 'node_modules', 'yogi', 'node_modules', 'shifter', 'bin', 'shifter'),
        logs = {
            stdout: [],
            stderr: []
        },
        child = spawn(s, [
            '--no-global-config',
            '--istanbul',
            '--coverage',
            '--no-exec',
            '--clean',
            '--lint-stderr'
        ], {
            cwd: cwd
        });
    child.stdout.on('data', function(data) {
        logs.stdout.push(data.toString());
    });
    child.stderr.on('data', function(data) {
        logs.stderr.push(data.toString());
    });
    child.on('exit', function(code) {
        callback(code, logs);
    });
};

var antBuild = function(mod, cwd, callback) {
    log.warn('defaulting back to ant build for ' + mod);
    var logs = {
        stdout: [],
        stderr: []
    },
        child = spawn('ant', [
            'all'
        ], {
            cwd: cwd
        });

    child.stdout.on('data', function(data) {
        logs.stdout.push(data.toString());
    });
    child.stderr.on('data', function(data) {
        logs.stderr.push(data.toString());
    });
    child.on('exit', function(code) {
        callback(code, logs);
    });
};

var ant = function(mod, cwd, callback) {
    log.info('shifting ant files for ' + mod);
    var s = path.join(__dirname, '../../', 'node_modules', '.bin', 'shifter'),
        logs = {
            stdout: [],
            stderr: []
        },
        child = spawn(s, [
            '--quiet',
            '--ant',
            '--no-global-config',
            '--coverage',
            '--no-exec'
        ], {
            cwd: cwd
        });
    child.stdout.on('data', function(data) {
        logs.stdout.push(data.toString());
    });
    child.stderr.on('data', function(data) {
        logs.stderr.push(data.toString());
    });
    child.on('exit', function() {
        var json;
        if (exists(path.join(cwd, 'build.json'))) {
            try {
                json = JSON.parse(fs.readFileSync(path.join(cwd, 'build.json'), 'utf8'));
            } catch (e) {
            }
        }
        if (json) {
            //Valid json..
            callback(0, logs);
        } else {
            //ant build..
            callback(1, logs);
        }
    });
};

exports.shifter = function(options, blob, done) {

    var cwd = path.join(options.output, 'src', options.module.module),
        finish = function(code, logs) {
            if (code) {
                log.warn('build exited with code ' + code);
                logs.stderr.push('build exited with code ' + code);
            }
            var reg = new RegExp(options.output, 'gim'),
                stdout = logs.stdout.join('').replace(reg, ''),
                stderr = logs.stderr.join('').replace(reg, ''),
                outLog = path.join(cwd, 'logs', 'shifter.stdout.log'),
                errLog = path.join(cwd, 'logs', 'shifter.stderr.log');

            mkdirp(path.dirname(outLog), function() {
                fs.writeFile(outLog, stdout, 'utf8', function() {
                    fs.writeFile(errLog, stderr, 'utf8', function() {
                        done(null, blob);
                    });
                });
            });

        };

    if (exists(path.join(cwd, 'build.json'))) {
        build(options.module.module, cwd, finish);
    } else {
        ant(options.module.module, cwd, function(code, aLogs) {
            if (code === 0) {
                build(options.module.module, cwd, function(code, logs) {
                    finish(code, {
                        stdout: [].concat(aLogs.stdout, logs.stdout),
                        stderr: [].concat(aLogs.stderr, logs.stderr)
                    });
                });
            } else {
                antBuild(options.module.module, cwd, function(code, logs) {
                    finish(code, {
                        stdout: [].concat(aLogs.stdout, logs.stdout),
                        stderr: [].concat(aLogs.stderr, logs.stderr)
                    });
                });
            }
        });
    }
};
