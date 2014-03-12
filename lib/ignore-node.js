var _ = require('lodash'),
  log = require("floorine"),
  rule = require("./rule"),
  MatchResult = require("./match-result");

var IgnoreNode = function() {
  this.rules = [];
};

IgnoreNode.prototype.addRule = function(rule) {
  log.info("Found pattern: %s", rule.pattern);
  this.rules.push(rule);
};

IgnoreNode.prototype.parse = function(text) {
  var self = this;

  text = text.replace(/\r\n/, '\n');
  _.each(text.split(/\n/), function(line) {
    var txt = line.trim();
    if (txt.length > 0 && txt.slice(0, 1) !== "#" && txt !== "/") {
      log.log(txt, text.length);
      self.addRule(new rule.Rule(txt));
    }
  });
};

IgnoreNode.prototype.isIgnored = function(entryPath, isDirectory)  {
  var rule;

  // Parse rules in the reverse order that they were read
  for (var i = this.rules.length - 1; i > -1; i--) {
    rule = this.rules[i];
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