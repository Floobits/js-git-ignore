var MatchResult = require("./match-result");

var IgnoreNode = function() {
  this.rules = [];
};

IgnoreNode.prototype.addRule = function(rule) {
  this.rules.push(rule);
};

IgnoreNode.prototype.parse = function(text) {
  var self = this;

  text = text.replace(/\r\n/, '\n');
  _.each(text.split(/\n/), function(line) {
    var txt = line.trim();
    if (txt.length > 0 && txt.slice(0, 1) !== "#" && txt !== "/") {
      self.addRule(txt);
    }
  });
};

IgnoreNode.prototype.isIgnored = function(entryPath, isDirectory)  {
  var rule;
  // if (this.rules.length === 0)
  //   return MatchResult.CHECK_PARENT;

  // Parse rules in the reverse order that they were read
  for (var i = this.rules.length - 1; i > -1; i--) {
    rule = this.rules[i];
    if (rule.isMatch(entryPath, isDirectory)) {
      if (!rule.negation)
        return MatchResult.IGNORED;
      else
        return MatchResult.NOT_IGNORED;
    }
  }
  return MatchResult.CHECK_PARENT;
};

exports.IgnoreNode = IgnoreNode;