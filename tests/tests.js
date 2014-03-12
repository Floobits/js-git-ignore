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
      test.ok(res, 'stuff should be ignored');
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
  },
  star: function (test) {
    var self = this, p = path.join(self.path, "efefefeee.txt");

    test.expect(1);
    this.ignore.addRule("*.txt");
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(res, p + " was not ignored?");
      test.done();
    });
  },
  starstar: function (test) {
    var self = this, p = path.join(self.path, "a/b/efefefeee.txt");

    test.expect(1);
    this.ignore.addRule("a/**/*.txt");
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(res, p + " was ignored?");
      test.done();
    });
  },
  starstar2: function (test) {
    var self = this, p = path.join(self.path, "b/b/efefefeee.txt");

    test.expect(1);
    this.ignore.addRule("a/**/*.txt");
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(!res, p + " was ignored?");
      test.done();
    });
  },
  negation: function (test) {
    var self = this, p = path.join(self.path, "a");

    test.expect(1);
    this.ignore.addRule("!a");
    this.ignore.addRule("a");
    this.ignore.isIgnored(p, function(err, res) {
      test.ok(!res, p + " was ignored?");
      test.done();
    });
  }

};