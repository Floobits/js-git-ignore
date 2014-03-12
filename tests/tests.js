var path = require("path"),
  ignore = require("../lib/ignore");

module.exports = {
  setUp: function (cb) {
    var p = path.join(__dirname, 'testdir1');
    this.ignore = new ignore.build(p, cb);
  },
  tearDown: function (callback) {
    this.ignore = null;
    callback();
  },
  test1: function (test) {
    var files = this.ignore.getFiles();
    console.log(files);
    test.equals(this.ignore.getFiles(), ['asdf.py']);
    test.done();
  }
};