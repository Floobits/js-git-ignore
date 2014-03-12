var _ = require('lodash'),
  path = require("path"),
  minimatch = require("minimatch");

var Rule = function(dir, pattern) {
  if (pattern.slice(0, 1) === "!"){
    this.negation = true;
    pattern = pattern.slice(1);
  }
  this.dirOnly = pattern.slice(-1) === "/";
  this.pattern = path.join(dir, pattern);
 };

Rule.prototype.isMatch = function(target, isDirectory) {
  if (target === this.pattern) {
    if (this.dirOnly && !isDirectory) {
      return false;
    }
    return true;
  }

  if (minimatch(target, this.pattern)) {
    return true;
  }
  return false;
};

Rule.prototype.getResult = function() {
  return !this.negation;
};

exports.Rule = Rule;