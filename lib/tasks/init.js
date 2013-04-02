
exports.init = function(options, blob, done) {
    var info = {
        options: options
    };
    done(null, new blob.constructor(info, blob));
};

