
exports.tree = function(options, blob, done) {
    var files = blob.result.files,
        mod = blob.result.module,
        reduced = {
            files: null,
            tree: []
        };

    //https://raw.github.com/yui/yui3/7baa008ec347c0a12821eac919ef8b934dd55944/build/app-base/app-base-coverage.js

    files.forEach(function(item) {
        reduced.tree.push({
            type: ((item.type === 'tree') ? 'directory' : 'file'),
            path: item.path,
            //url: 'https://raw.github.com/' + mod.github + '/' + mod.repo + '/' + item.sha + '/' + item.path
            url: 'https://raw.github.com/' + mod.github + '/' + mod.repo + '/' + mod.sha1 + '/' + item.path
        });
    });

    done(null, new blob.constructor(reduced, blob));
};
