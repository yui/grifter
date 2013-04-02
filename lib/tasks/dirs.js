
var mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    path = require('path'),
    Stack = require('../stack').Stack;

exports.dirs = function(options, blob, done) {
    var files = blob.result.tree,
        output = options.output,
        mod = options.module,
        base = path.join(output, 'src', mod.module),
        stack = new Stack();
    
    rimraf(base, stack.add(function() {
        files.forEach(function(item) {
            if (item.type === 'directory') {
                var p = item.path.replace(mod.path, path.join('src', mod.module,'/')),
                    d = path.join(output, p);
                mkdirp(d, stack.add(function() {
                }));
            }
        });
    }));
    
    
    stack.done(function() {
        done(null, blob);
    });
    

};
