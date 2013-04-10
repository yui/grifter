Grifter - The Gallery Module Stealer
====================================

This is HIGHLY experimental and probably shouldn't be installed, just saying.

*This package is not published to NPM yet, since it's highly specific and still under development*

Install
-------

Clone this repo, then `sudo npm link` (probably best to do it this way)

Setup
-----

Create a `.grifter.json` file under `$HOME` similar to this:

```
{
    "username": "--YUILIBRARY USERNAME .yogi.json--",
    "token": "--TOKEN FROM .yogi.json--",
    "apiHost": "yuilibrary.com",
    "gh_user": "--GITHUB USERNAME .yogi.json--",
    "gh_token": "--TOKEN FROM .yogi.json--",
    "master": "git@github.com:yui/yui3-gallery.git",
    "release": true,
    "save": true,
    "post": false,
    "cssproc": "http://yui.yahooapis.com/{buildtag}/"
}
```

Usage
-----

```
mkdir gallery-build
cd gallery-build
grifter
```

What it does
------------

`grifter` attempts to do the following:

* Query the Gallery CDN Queue API (`yogi cdn queue`)
* Assemble the URL's and Paths to the modules with that data
* Batch fetch the module files from GitHub
* Build a proper filesystem (based on YUI) from the remote files
* Walks each changed module and runs a custom `yogi build --test`
* Stores all the output into log files.
* Collects all the logs an mixed that into a `JSON` blob.
* Zips up the results into a valid CDN deployment
* Checks the changes into the provided GIT repo
* Posts the data back to the Gallery API (if `--post` is passed)

This is what we currently use to publish the Gallery builds weekly.

Future
------

A lot of this could potentially be rebuilt into `grunt` tasks and this is what I recommend.
