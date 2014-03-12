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
  var _rule = new rule.Rule(path.join(this.path, pattern));
  this.ignoreNode.addRule(_rule);
};

Ignore.prototype.findIgnores = function(files, cb) {
  var self = this;

  async.each(files, function(file, cb){

    if (settings.IGNORE_FILES.indexOf(file.name) < 0) {
      cb();
      return;
    }

    fs.readFile(file.path, function(err, data) {
      log.log("parsing %s", file.path);
      if (err) {
        log.error(err);
        cb();
        return;
      }
      self.ignoreNode.parse(data.toString("utf8"));
      cb();
    });
  }, cb);
};

Ignore.prototype.getFiles = function() {
  var self = this,
    files = this.files.slice(0);

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
    children_stats: ["children", function(cb, res) {
      async.mapLimit(res.children, 5, function(name, cb) {
        var p = path.join(self.path, name);
        log.log(p);

        fs.lstat(p, function(err, stats) {
          if (err) {
            log.log(err);
            cb();
            return;
          }
          cb(null, {path: p, stats: stats, name: name});
          return;
        });
      }, function(err, results) {
        cb(err, results.filter(function(item) { return !!item; }));
      });
    }],
    partition: ["children_stats", function(cb, res) {
      var files = [], dirs = [];

      _.each(res.children_stats, function(child) {
        var stats = child.stats;

        if (stats.isSymbolicLink() || stats.isBlockDevice() || stats.isCharacterDevice() || stats.isFIFO()) {
          return;
        }
        if (stats.isDirectory()) {
          dirs.push(child);
          return;
        }
        files.push(child);
      });
      cb(null, {files: files, dirs: dirs});
    }],
    our_ignores: ["partition", function(cb, res) {
      var files = res.partition.files;
      self.size += _.reduce(files, function(memo, child){return memo + child.stats.size;}, 0);
      self.findIgnores(files, cb);
    }],
    child_ignores: ["partition", function(cb, res) {
      async.forEachLimit(res.partition.dirs, 5, function(child, cb){
        var child_ignore = new Ignore(child.path, self.depth + 1);
        self.children[child.name] = child_ignore;
        child_ignore.findIgnores(function(){
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
    relative = path.relative(file, ROOT_PATH);

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

Ignore.prototype.is_hidden = function(path) {
  var parts = relative.split("/");
  for (var name in parts) {
    if (file.slice(0, 1) === "." && WHITE_LIST.indexOf(file) < 0) {
      log.info("Ignoring %s because it is hidden.", file);
      return true;
    }
  }
  return false;
};
Ignore.prototype.isIgnored = function(file, cb) {
  var self = this;
  if (self._isFlooIgnored(file)) {
    cb(null, true);
    return;
  }

  fs.lstat(file, function(err, stats) {
    var split, isIgnored;

    if (err) {
      return cb(err);
    }
    if (stats.size >= settings.MAX_FILE_SIZE) {
      return cb(null, true);
    }
    split = path.relative(file, ROOT_PATH).split("/");
    isIgnored = self.isGitIgnored(file, stats.isDirectory(), split);
    return cb(null, isIgnored);
  });
};

// public static void writeDefaultIgnores(FlooContext context) {
//     log.log("Creating default ignores.");
//     String path = FilenameUtils.concat(context.colabDir, ".flooignore");

//     try {
//         File f = new File(path);
//         if (f.exists()) {
//             return;
//         }
//         FileUtils.writeLines(f, DEFAULT_IGNORES);
//     } catch (IOException e) {
//         log.warn(e);
//     }
// }

module.exports = function(path, cb) {
  rootIgnore = new Ignore(path, 0);
  rootIgnore.addRule(".idea/workspace.xml");
  rootIgnore.addRule("node_modules/");
  rootIgnore.addRule(".idea/misc.xml");
  rootIgnore.addRule(".git/");
  rootIgnore.findChildren(function(err) {
    log.log(rootIgnore.size);
    return cb(err, rootIgnore);
  });
};
