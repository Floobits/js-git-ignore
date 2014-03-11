var fs = require("fs"),
  _ = require('lodash'),
  path = require("path"),
  log = require("floorine"),
  async = require("async"),
  util = require("util"),
  ignoreNode = require("./ignore-node"),
  rule = require("./rule"),
  MatchResult = require("./match-result");

var IGNORE_FILES = [".gitignore", ".hgignore", ".flignore", ".flooignore"],
  WHITE_LIST = _.union(IGNORE_FILES, [".floo", ".idea"]),
  DEFAULT_IGNORES = ["extern", "node_modules", "tmp", "vendor", ".idea/workspace.xml", ".idea/misc.xml", ".git"],
  MAX_FILE_SIZE = 1024 * 1024 * 5,
  ROOT_PATH,
  rootIgnore;

var Ignore = function(path, depth) {
  log.log("%s: %s", depth, path);
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

Ignore.prototype.findIgnores = function(cb) {
  var self = this;

  fs.readDir(this.path, function(err, children) {
    if (err) {
      log.error(err);
      cb();
      return;
    }
    async.each(children, function(name, cb){
      var abs = path.join(self.path, name);

      if (IGNORE_FILES.indexOf(name) < 0) {
          cb();
          return;
      }

      fs.readFile(abs, {"encoding": "utf8"}, function(err, file) {
        self.ignoreNode.parse(file);
        cb();
      });
    }, cb);
  });
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
  var self = this;

  fs.readdir(this.path, function(err, children) {
    if (err) return cb();

    async.each(children, function(file, cb) {
      var p = path.join(self.path, file);
      log.log(p);

      fs.lstat(p, function(err, stats) {
        var isDir, child;

        if (stats.isSymbolicLink() || stats.isBlockDevice() || stats.isCharacterDevice() || stats.isFIFO()) {
          return cb();
        }
        if (file.slice(0, 1) === "." && WHITE_LIST.indexOf(file) < 0) {
          return cb();
        }

        isDir = stats.isDirectory();
        if (rootIgnore.isGitIgnored(p, isDir, p.split("/"))) {
          return cb();
        }
        if (isDir) {
          child = new Ignore(p, self.depth + 1);
          self.children[file] = child;
          child.findChildren(function() {
            self.size += child.size;
            return cb();
          });
          return;
        }
        self.files.push(file);
        self.size += util.inspect(stats).size;
        cb();
      });
    }, cb);
  }, cb); 
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
  // if (virtualFile.is(VFileProperty.SPECIAL) || virtualFile.is(VFileProperty.SYMLINK)) {
  //     log.log("Ignoring %s because it is special or a symlink.", file);
  //     return true;
  // }
  parts = relative.split("/");
  for (var name in parts) {
    if (file.slice(0, 1) === "." && WHITE_LIST.indexOf(file) < 0) {
      log.log("Ignoring %s because it is hidden.", file);
      return true;
    }
  }
  // if (!virtualFile.isDirectory() && virtualFile.getLength() > MAX_FILE_SIZE) {
  //     log.log("Ignoring %s because it is too big (%s)", file, virtualFile.getLength());
  //     return true;
  // }
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
      cb(err);
      return;
    }
    split = path.relative(file, ROOT_PATH).split("/");
    isIgnored = self.isGitIgnored(file, stats.isDirectory(), split);
    cb(null, isIgnored);
    return;
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
  rootIgnore.addRule("node_modules");
  rootIgnore.addRule(".idea/misc.xml");
  rootIgnore.addRule(".git");
  rootIgnore.findChildren(function(err) {
    return cb(err, rootIgnore);
  });
};
