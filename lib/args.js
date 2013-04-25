
var path = require('path');
var nopt = require('nopt'),
    known = {
        help: Boolean,
        version: Boolean,
        github: Boolean,
        gh_user: String,
        gh_token: String,
        master: String,
        release: Boolean,
        save: Boolean,
        post: Boolean,
        output: path,
        'global-config': Boolean
    },
    shorts = {
        "v" : ["--version"],
        "h" : ["--help"]
    };

var raw = function (args) {
    var parsed = nopt(known, shorts, (args || process.argv));
    return parsed;
};

var has = function (a) {
    var cooked = raw().argv.cooked,
        ret = false;

    cooked.forEach(function (o) {
        if ((o === '--' + a) || (o === '--no-' + a)) {
            ret = true;
        }
    });

    return ret;
};

var parse = function (args) {
    var parsed = raw(args);
    delete parsed.argv;

    //Default true
    parsed['global-config'] = (parsed['global-config'] === undefined || parsed['global-config']) ? true : false;
    parsed.release = (parsed.release === undefined || parsed.release) ? true : false;
    parsed.save = (parsed.save === undefined || parsed.save) ? true : false;

    if (!parsed.apiHost) {
        parsed.apiHost = 'yuilibrary.com';
    }

    if (!parsed.cssproc) {
        parsed.cssproc = 'http://yui.yahooapis.com/{buildtag}/';
    }

    if (parsed.output === undefined) {
        parsed.output = path.join(process.cwd(), 'build');
    }

    if (parsed.master === undefined) {
        parsed.master = 'https://github.com/yui/yui3-gallery/tarball/master';
    }
    if (parsed.master === 'false') {
        parsed.master = false;
    }

    //parsed.cache = (parsed.cache === undefined || parsed.cache === false) ? false : true;
    return parsed;
};

exports.has = has;
exports.raw = raw;
exports.parse = parse;
exports.shorts = shorts;
exports.known = known;
