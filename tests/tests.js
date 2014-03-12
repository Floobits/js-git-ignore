var path = require("path"),
  ignore = require("../lib/ignore");

exports.tests = {
  setUp: function (cb) {
    var self = this;

    self.path = path.join(__dirname, 'testdir1');
    
    ignore.build(self.path, function(err, ignore) {
      self.ignore = ignore;
      cb();
    });
  },
  simple: function (test) {
    var self = this,
      p = path.join(self.path, "stuff");

    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(!res, 'stuff should be ignored');
      test.done();
    });
  },
  dir: function (test) {
    var self = this,
      p = path.join(self.path, "ignoreMe");

    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(!res, 'not ignored');
      test.done();
    });
  },
  dir2: function (test) {
    var self = this,
      p = path.join(self.path, "ignoreMe") + "/";
    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(res, 'not ignored');
      test.done();
    });
  },
  dotGit: function (test) {
    var self = this,
      p = path.join(self.path, ".git");
    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(res, '.git should always be ignored ignored');
      test.done();
    });
  },
  dotDot: function (test) {
    var self = this,
      p = path.join(self.path, ".dot");
    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(res, 'not ignored');
      test.done();
    });
  },
  notIgnored: function (test) {
    var self = this, p = path.join(self.path, "fieefejjje");

    test.expect(1);
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(!res, p + " was ignored?");
      test.done();
    });
  }
};