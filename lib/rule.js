var _ = require('lodash'),
  minimatch = require("minimatch");

var Rule = function(pattern) {
  this.pattern = pattern;
  this.negation = pattern.slice(0, 1) === "!";
  this.dirOnly = pattern.slice(-1) === "/";
};

Rule.prototype.isMatch = function(target, isDirectory) {
  if (target === this.pattern) {
    if (this.dirOnly && !isDirectory) {
      return false;
    }
    return true;
  }

  if (minimatch(this.pattern, target)) {
    return true;
  }
  return false;
};

Rule.prototype.getResult = function() {
  return !this.negation;
};

exports.Rule = Rule;