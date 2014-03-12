var _ = require('lodash'),
  fs = require("fs"),
  log = require("floorine"),
  rule = require("./rule"),
  path = require("path"),
  MatchResult = require("./match-result");

var IgnoreNode = function() {
  this.rules = [];
};

IgnoreNode.prototype.addRule = function(rule) {
  log.log("Found pattern: %s", rule.pattern);
  this.rules.push(rule);
};

IgnoreNode.prototype.parse = function(file, cb) {
  var self = this;

  fs.readFile(file, function(err, data) {
    var text, dirname;
    log.log("parsing %s", file);
    if (err) {
      log.error(err);
      cb();
      return;
    }
    dirname = path.dirname(file);
    text = data.toString("utf8").replace(/\r\n/, '\n');
    _.each(text.split(/\n/), function(line) {
      var txt = line.trim();
      if (txt.length > 0 && txt.slice(0, 1) !== "#" && txt !== "/") {
        self.addRule(new rule.Rule(path.join(dirname, txt)));
      }
    });
    cb();
  });
};

IgnoreNode.prototype.isIgnored = function(entryPath, isDirectory)  {
  var rule;

  // Parse rules in the reverse order that they were read
  for (var i = this.rules.length - 1; i > -1; i--) {
    rule = this.rules[i];
    // log.log(rule.pattern, entryPath, isDirectory);
    if (rule.isMatch(entryPath, isDirectory)) {
      if (!rule.negation) {
        log.info("ignoring %s because %s", entryPath, rule.pattern);
        return MatchResult.IGNORED;
      }
      else {
        log.info("not ignoring %s because %s", entryPath, rule.pattern);
        return MatchResult.NOT_IGNORED;
      }
    }
  }
  return MatchResult.CHECK_PARENT;
};

exports.IgnoreNode = IgnoreNode;