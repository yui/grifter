var fs = require('fs'),
    readline = require('readline'),
    path = require('path'),
    rl;


var find = function(dir, file, cb) {
    var files = fs.readdirSync(dir),
    found = files.some(function(f) {
        if (f === file) {
            cb(null, path.join(dir, f));
            return true;
        }
    }),
    next = path.join(dir, '../');

    if (!found) {
        if (dir === next) {
            cb(true);
            return;
        }
        find(next, file, cb);
    }
};

exports.find = find;

exports.prompt = function(str, cb, mask) {
    if (!rl) {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

    }
    if (mask) {
        process.stdout.write(str);
        rl.output = {
            write: function() {}
        };
        process.stdin.on('keypress', function(c, key) {
            if (key && key.name === 'enter') {
                process.stdout.pause();
            } else {
                process.stdout.write('*');
            }
        });
    } else {
        rl.output = process.stdout;
    }
    rl.question(str, function(answer) {
        rl.pause();
        if (mask) {
            process.stdout.write('\n');
        }
        cb(answer);
    });
};

exports.prettySize = function(size) {
    var mb = 1024 * 1024;
    if (size >= mb) {
        mysize = (size / mb).toFixed(1) + 'MB';
    } else if (size >= 1024) {
        mysize = (size / 1024).toFixed(1) + 'Kb';
    } else {
        mysize = size + ' bytes';
    }
    return mysize;
};

