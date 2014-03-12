var fs = require("fs"),
  _ = require('lodash'),
  path = require("path"),
  log = require("floorine"),
  async = require("async"),
  util = require("util"),
  settings = require('./settings'),
  ignoreNode = require("./ignore-node"),
  rule = require("./rule"),
  MatchResult = require("./match-result"),
  ROOT_PATH,
  rootIgnore;

var Ignore = function(path, depth) {
  log.info("NODE => %s: %s", depth, path);
  this.depth = 0;
  this.children = {};
  this.files = [];
  this.size = 0;
  this.path = path;
  this.ignoreNode = new ignoreNode.IgnoreNode();
};

Ignore.prototype.addRule = function(pattern) {
  var _rule = new rule.Rule(this.path, pattern);
  this.ignoreNode.addRule(_rule);
};

Ignore.prototype.findIgnores = function(files, cb) {
  var self = this;
  async.each(files, function(file, cb){
    var name = path.basename(file);

    if (settings.IGNORE_FILES.indexOf(name) < 0) {
      // log.log('ignoring %s', file);
      cb();
      return;
    }
    self.ignoreNode.parse(file, cb);
  }, cb);
};

Ignore.prototype.getFiles = function() {
  var self = this,
    files = self.files.slice(0);

  _.each(self.children, function(child) {
    files.push.apply(files, child.getFiles());
  });

  return files;
};

Ignore.prototype.findChildren = function (cb) {
  var self = this, auto;
  
  auto = {
    children: function(cb) {
      fs.readdir(self.path, cb);
    },
    dirs: ["children", function(cb, res) {
      var dirs = [];

      async.eachLimit(res.children, 5, function(name, cb) {
        var p = path.join(self.path, name);

        fs.lstat(p, function(err, stats) {
          if (err) {
            log.log(err);
            return cb();
          }
          if (stats.isSymbolicLink() || stats.isBlockDevice() || stats.isCharacterDevice() || stats.isFIFO()) {
            return cb();
          }
          if (rootIgnore.isGitIgnored(p, stats.isDirectory(), p.split("/"))) {
            return cb();
          }

          if (stats.isDirectory()) {
            dirs.push({path: p, name: name});
            return cb();
          }
          self.size += stats.size;
          self.files.push(p);
          return cb();
        });
      }, function(err) {
        cb(err, dirs);
      });
    }],
    our_ignores: ["dirs", function(cb, res) {
      self.findIgnores(self.files, cb);
    }],
    child_ignores: ["our_ignores", function(cb, res) {
      async.forEachLimit(res.dirs, 5, function(child, cb) {
        var child_ignore = new Ignore(child.path, self.depth + 1);
        self.children[child.name] = child_ignore;
        child_ignore.findChildren(function(){
          self.size += child_ignore.size;
          cb();
        });
      }, cb);
    }]
  };

  async.auto(auto, cb);
};

Ignore.prototype.isGitIgnored = function(path, isDir, split) {
  var self = this, nextName, ignore,
    ignored = self.ignoreNode.isIgnored(path, isDir);

  switch (ignored) {
    case MatchResult.IGNORED:
      return true;
    case MatchResult.NOT_IGNORED:
      return false;
    default:
      break;
  }

  if (split.length <= self.depth + 1) {
      return false;
  }
  nextName = split.slice(self.depth, self.depth + 1);
  ignore = self.children[nextName];
  return ignore && ignore.isGitIgnored(path, isDir, split);
};

Ignore.prototype.isFlooIgnored = function(file) {
  var parts,
    self = this,
    relative = path.relative(ROOT_PATH, file);

  if (relative.indexOf("..") >= 0) {
    log.log("Ignoring %s because it isn't shared.", file);
    return true;
  }

  if (file === self.path) {
    return false;
  }

  if (self.is_hidden(file)) {

    return true;
  }
  // if (virtualFile.is(VFileProperty.SPECIAL) || virtualFile.is(VFileProperty.SYMLINK)) {
  //     log.log("Ignoring %s because it is special or a symlink.", file);
  //     return true;
  // }

  // if (!virtualFile.isDirectory() && virtualFile.getLength() > MAX_FILE_SIZE) {
  //     log.log("Ignoring %s because it is too big (%s)", file, virtualFile.getLength());
  //     return true;
  // }
  return false;
};

Ignore.prototype.is_hidden = function(_path) {
  var parts = _path.split("/"), part;
  for (var i = 0; i < parts.length; i++) {
    part = parts[i];
    if (part.slice(0, 1) === "." && settings.WHITE_LIST.indexOf(part) < 0) {
      log.info("Ignoring %s because it is hidden.", part);
      return true;
    }
  }
  return false;
};

Ignore.prototype.isIgnored = function(file, cb) {
  var self = this;
  if (self.isFlooIgnored(file)) {
    cb(null, true);
    return;
  }

  fs.lstat(file, function(err, stats) {
    var split, isIgnored;

    if (!err && stats.size >= settings.MAX_FILE_SIZE) {
      return cb(null, true);
    }
    split = path.relative(ROOT_PATH, file).split("/");
    log.log(split, file);
    isIgnored = self.isGitIgnored(file, !err ? stats.isDirectory() : file.slice(-1) === "/" , split);
    return cb(err, isIgnored);
  });
};

exports.writeDefaultIgnores = function(p, cb) {
  var defaults = settings.DEFAULT_IGNORES.join("\n");

  fs.writeFile(path.join(p, ".flooignore"), defaults, cb);
};

exports.build = function(path, cb) {
  ROOT_PATH = path;
  rootIgnore = new Ignore(path, 0);
  rootIgnore.addRule(".idea/workspace.xml");
  rootIgnore.addRule("node_modules/");
  rootIgnore.addRule(".idea/misc.xml");
  rootIgnore.addRule(".git/");
  rootIgnore.findChildren(function(err) {
    return cb(err, rootIgnore);
  });
};