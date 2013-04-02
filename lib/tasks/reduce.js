
var path = require('path');

var EXT = {
    '.png': 1,
    '.jpg': 1,
    '.jpeg': 1,
    '.gif': 1,
    '.css': 1,
    '.js': 1,
    '.html': 1,
    '.htm': 1,
    '.json': 1,
    '.xml': 1,
    '.properties': 1
};

var safe = function(item) {
    //TODO use this module: http://github.com/mscdex/mmmagic
    var extname = path.extname(item.path).toLowerCase();
    return EXT[extname];
};

var log = require('../log');

var validPath = function(mod, item) {
    var ret = false;
    if (mod.path.substr(-1) === '/') {
        mod.path = mod.path.substring(0, mod.path.length - 1);
    }
    
    if (item.path.indexOf(mod.path) === 0) {
        ret = true;
    }
    switch (mod.path) {
        case '':
        case '.':
        case '/':
        case './':
            ret = true;
            mod.path = '';
            break;
    }

    return ret;
};

exports.reduce = function(options, blob, done) {
    var tree = blob.result.tree,
        mod = blob.result.module,
        err = null,
        reduced = {
            module: mod,
            files: [],
            tree: null
        };

        if (Array.isArray(tree.tree)) {
            tree.tree.forEach(function(item) {
                if (validPath(mod, item)) {
                    if (item.type === 'file') {
                        if (safe(item)) {
                            reduced.files.push(item);
                        } else {
                            log.warn('unsafe file skipped: ' + item.path);
                        }
                    } else {
                        reduced.files.push(item);
                    }
                }
            });
        } else {
            err = 'No files in this request, maybe the sha or repo was wrong?';
        }


    if (!reduced.files.length && !err) {
        err = 'The path or sha for this module seems to be incorrect!';
    }

    done(err, new blob.constructor(reduced, blob));
};
