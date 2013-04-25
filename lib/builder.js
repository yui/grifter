var Queue = require('gear').Queue,
    Registry = require('gear').Registry,
    Stack = require('./stack').Stack,
    log = require('./log'),
    request = require('request'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    cpr = require('cpr').cpr,
    timer = require('timethat'),
    tasks = require('./tasks'),
    findit = require('walkdir'),
    spawn = require('child_process').spawn,
    tar = require('tar'),
    zlib = require('zlib'),
    archiver = require('archiver'),
    util = require('./util'),
    git = require('./git'),
    api = require('./api'),
    fs = require('graceful-fs');

var registry = new Registry({
    dirname: path.resolve(__dirname, '../', 'node_modules', 'gear-lib', 'lib')
});

registry.load({
    tasks: tasks
});

var post = function(options, results, callback) {
    var json = {
        buildtag: options.buildtag,
        build: results
    },
    file = path.join(process.cwd(), 'results-' + options.buildtag + '.json');

    if (options.save) {
        fs.writeFileSync(file, JSON.stringify(json, null, 4), 'utf8');
    }
    if (!options.post) {
        return callback(null);
    }
    log.info('posting results');

    api.post('/cdn/results/', {
        buildtag: options.buildtag,
        build: JSON.stringify(results)
    }, function() {
        console.log(arguments);
        callback();
    });
};


var gather = function(options, modules, callback) {
    if (!options.release) {
        return callback(null);
    }
    log.info('gathering reporting data for ' + modules.length + ' modules');
    var stack = new Stack(),
        start = new Date(),
        results = [],
        base = path.join(options.output, 'src');

    modules.forEach(function(mod) {
        var p = path.join(base, mod.module, 'logs');
        fs.readdir(p, stack.add(function(err, files) {
            var data = {
                errors: options.errors[mod.module],
                module: mod,
                stderr: [],
                stdout: [],
                tests: {},
                logs: ''
            }, substack = new Stack(),
            done = function() {
                if (data.stdout.length || data.stderr.length) {
                    data.logs = data.stdout.join('\n') + '\n' + data.stderr.join('\n');
                }
                if (data.errors) {
                    data.logs += '---------- start build errors --------------\n';
                    data.logs += data.errors + '\n';
                    data.logs += '----------  end build errors  --------------\n';
                }
                delete data.stdout;
                delete data.stderr;
                results.push(data);
            };

            if (files) {
                files.forEach(function(file) {
                    var ext = path.extname(file),
                        type = 'stdout';
                    if (ext === '.log') {
                        fs.readFile(path.join(p, file), 'utf8', substack.add(function(err, str) {
                            if (file.indexOf('stderr') > -1) {
                                type = 'stderr';
                            }
                            str = str || '      no data logged  \n';
                            data[type].push('---------- start logs from ' + file + ' ----------\n');
                            data[type].push('   ' + str.split('\n').join('\n    '));
                            data[type].push('----------  end logs from ' + file + '  ----------\n');
                        }));
                    }

                    if (ext === '.json') {
                        fs.readFile(path.join(p, file), 'utf8', substack.add(function(err, str) {
                            data.tests = JSON.parse(str);
                        }));
                    }
                });
                substack.done(stack.add(done));
            } else {
                done();
            }
        }));
    });

    stack.done(function() {
        var end = new Date();
        log.info(results.length + ' results gathered in ' + timer.calc(start, end));
        callback(results);
    });
};

var bundle = function(options, callback) {
    if (!options.release) {
        return callback();
    }
    var start = path.join(options.output, 'build'),
        finder = findit.find(start),
        prefix = 'cdn_' + options.buildtag,
        zipStart = new Date(),
        paths = [];

    finder.on('path', function(file) {
        paths.push(path.relative(start, file));
    });

    finder.on('end', function() {
        log.info('creating zip file for deployment');
        var out = fs.createWriteStream(path.join(process.cwd(), prefix + '.zip')),
            zip = archiver.createZip({ level: 1 }),
            done = function() {
                zip.finalize(function(err, written) {
                    if (!written && err) {
                        written = err;
                    }
                    log.info('created zip in ' + timer.calc(zipStart, new Date()));
                    log.info(util.prettySize(written) + ' written');
                    callback();
                });
            },
            add = function() {
                var f = paths.pop(),
                    file;
                if (f) {
                    file = path.join(options.output, 'build', f);
                    fs.stat(file, function(err, stat) {
                        if (stat.isFile()) {
                            zip.addFile(fs.createReadStream(file), {
                                name: path.join(options.buildtag, 'build', f)
                            }, function() {
                                add();
                            });
                        } else {
                            add();
                        }
                    });
                } else {
                    done();
                }
            };

        zip.pipe(out);

        add();
    });

};

var commit = function(mods, options, callback) {
    var hasGit = options.master && (options.master.match(/^git?:\/\//) || options.master.match(/^git@/)),
        modules = [],
        _cleanup = function() {
            log.info('cleaning up git left overs');
            git.commit(options.output, [], 'Gallery Cleanup: ' + options.buildtag, function() {
                callback(modules);
            });
        },
        _commit = function() {
            var mod = mods.pop(),
                cwd, json, paths = [], msg;
            if (mod) {
                modules.push(mod);
                cwd = path.join(options.output, 'src', mod.module);
                try {
                    json = require(path.join(cwd, 'build.json'));
                    Object.keys(json.builds).forEach(function(name) {
                        var dir = path.join(cwd, '../../build/', name);
                        paths.push(dir);
                    });
                } catch (e) {
                }

                msg = options.buildtag + ' ' + mod.github + ' ' + mod.module;
                git.commit(cwd, paths, msg, function() {
                    _commit();
                });
            } else {
                _cleanup();
            }
        };

    if (hasGit) {
        _commit();
    } else {
        callback(mods);
    }
};

var build = function(options, mod, callback) {
    log.info('stealing ' + mod.module);
    var queue = new Queue({
        logger: log,
        registry: registry
    }),
        git = options.master && (options.master.match(/^git?:\/\//) || options.master.match(/^git@/));

    queue.concat() //Bug??
        .init(options)
        .fetch(mod)
        .reduce()
        .tree()
        .dirs({
            module: mod,
            output: options.output
        })
        .files({
            module: mod,
            output: options.output
        })
        .log('local files & directories created, shifting')
        .logs({
            module: mod,
            output: options.output
        });

    if (git) {
        queue.log('building and testing ' + mod.module + ' with yogi')
            .yogi({
                module: mod,
                output: options.output,
                buildtag: options.buildtag,
                cssproc: options.cssproc.replace('{buildtag}', options.buildtag)
            });
    } else {
        queue.shifter({
            module: mod,
            output: options.output
        })
            .log('yogi testing skipped');
    }

    queue.run(function(err) {
        callback(err, mod.module);
    });

};

var clean = function(output, callback) {
    rimraf(output, function() {
        mkdirp(path.join(output, 'src'), function() {
            callback();
        });
    });
};

var master = function(tarball, output, callback) {

    var start, baseDir, tarFile, tarWrite, req;

    if (tarball) {
        log.info('grifting ' + tarball);
        if (tarball.match(/^https?:\/\//)) {
            tarFile = path.join(output, 'tarfile.tar');
            tarWrite = fs.createWriteStream(tarFile);
            req = request.get({
                url: tarball,
                headers: {
                    'User-Agent': 'grifter CLI tool'
                }
            }, function() {
                log.info('reading tar file..');
                var readTar = fs.createReadStream(tarFile);
                readTar.pipe(tar.Parse())
                    .once('entry', function (e) {
                        if (!baseDir && e.props.path) {
                            //This should be the dynamic path
                            // that Github adds to the tarballs
                            baseDir = e.props.path;
                            log.info('extracting tar file to ' + output);
                            var readTar = fs.createReadStream(tarFile);
                                readTar.pipe(tar.Extract({ path: output }))
                                    .on('end', function() {
                                        log.info('tar file extracted');
                                        var from = path.join(output, baseDir, 'src'),
                                            to = path.join(output, 'src');
                                        log.info('copying from ' + from);
                                        log.info('copying to ' + to);
                                        cpr(from, to, {
                                            confirm: true
                                        }, function() {
                                            log.info('cleaning up..');
                                            rimraf(path.join(output, baseDir), function() {
                                                log.info('removing temp tar file');
                                                fs.unlink(tarFile, function() {
                                                    log.info('proceeding..');
                                                    callback();
                                                });
                                            });
                                        });
                                    });
                        }
                    });
            }).pipe(zlib.createGunzip())
                .pipe(tarWrite);
        } else if (tarball.match(/^git?:\/\//) || tarball.match(/^git@/)) {
            log.info('stealing the git repo, this may take a few moments...');
            start = new Date();
            rimraf(output, function() {
                var git = spawn('git', [
                    'clone',
                    '--depth',
                    '10',
                    tarball,
                    output
                ], {
                    env: process.env,
                    stdio: 'inherit',
                    cwd: path.join(output, '../')
                });
                git.on('exit', function(code) {
                    if (code) {
                        log.bail('git exited with code: ' + code);
                    }
                    var end = new Date();
                    log.info('stole the git repo in ' + timer.calc(start, end));
                    callback();
                });
            });
        } else {
            log.bail('grifter does not know what to steal here: ' + tarball);
        }
    } else {
        log.log('skipping master download');
        callback();
    }
};

exports.process = function(options, json, callback) {
    var start = (new Date());
    log.info('stashing the score in ' + options.output);

    clean(options.output, function() {
        master(options.master, options.output, function() {
            var stack = new Stack(),
                count = json.modules.length;

            options.errors = {};

            json.modules.forEach(function(mod) {
                build(options, mod, stack.add(function(err, name) {
                    if (err) {
                        log.err(name + ': ' + err);
                        options.errors[name] = err;
                    }
                    log.info(name + ' has been stolen');
                }));
            });

            stack.done(function() {
                log.info('commiting...');
                commit(json.modules, options, function(modules) {
                    log.info('bundling...');
                    bundle(options, function() {
                        log.info('gathering...');
                        gather(options, modules, function(results) {
                            log.info('posting...');
                            post(options, results, function() {
                                var end = (new Date());
                                log.info('stole ' + count + ' modules in ' + timer.calc(start.getTime(), end.getTime()));
                                if (Object.keys(options.errors).length) {
                                    log.warn(Object.keys(options.errors).length + ' failed to build');
                                    Object.keys(options.errors).forEach(function(mod) {
                                        log.warn(mod + ': ' + options.errors[mod]);
                                    });
                                }
                                callback(results);
                            });
                        });
                    });
                });
            });
        });
    });
};
