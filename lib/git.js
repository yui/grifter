var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var exists = fs.existsSync || path.existsSync;

exports.commit = function(cwd, paths, message, callback) {
    var args = [
        'add',
        '.'
    ],add,
    _commit = function() {
        if (!exists(cwd)) {
            return callback();
        }
        var commitArgs = [
            'commit'
        ], commit;
        if (!paths.length) {
            commitArgs.push('-a');
        }
        commitArgs.push('-m');
        commitArgs.push(message);
        commit = spawn('git', commitArgs, {
            env: process.env,
            //stdio: 'inherit',
            cwd: cwd
        });
        commit.on('exit', function() {
            callback();
        });
    };

    paths.forEach(function(item) {
        args.push(item);
    });
    
    if (paths.length) {
        add = spawn('git', args, {
            env: process.env,
            //stdio: 'inherit',
            cwd: cwd
        });
        
        add.on('exit', function() {
            _commit();
        });
    } else {
        _commit();
    }
};


