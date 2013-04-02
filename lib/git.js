var spawn = require('child_process').spawn;

exports.commit = function(cwd, paths, message, callback) {
    var args = [
        'add',
        '.'
    ],add,
    _commit = function() {
        var commitArgs = [
            'commit'
        ], commit;
        if (!paths.length) {
            commitArgs.push('-a');
        }
        commitArgs.push('-m');
        commitArgs.push(message);
        commit = spawn('git', commitArgs, {
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
            cwd: cwd
        });
        
        add.on('exit', function() {
            _commit();
        });
    } else {
        _commit();
    }
};


