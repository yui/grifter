

var request = require('request'),
    fs = require('fs'),
    path = require('path'),
    log = require('../log'),
    mkdirp = require('mkdirp'),
    Stack = require('../stack').Stack;

exports.files = function(opts, blob, done) {
    var files = blob.result.tree,
        mod = opts.module,
        counter = 0,
        stack = new Stack();

    files.forEach(function(item) {
        if (item.type === 'file') {
            var p = item.path.replace(mod.path, path.join('src', mod.module, '/')),
                d = path.join(opts.output, p),
                writer;
            mkdirp(path.dirname(d), stack.add(function() {
                writer = fs.createWriteStream(d);
                request.get({
                    url: item.url
                }, stack.add(function() {
                    counter++;
                    //process.stdout.write('.');
                })).pipe(writer);
            }));
        }
    });
    
    stack.done(function() {
        log.log(counter + ' files stolen for ' + mod.module);
        done(null, blob);
    });

};
