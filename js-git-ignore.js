#!/usr/bin/env node

var buildIgnores = require("./lib/ignore"),
    floorine = require("floorine");

exports.run = function () {
  floorine.set_log_level("debug");
  floorine.log("starting");
  var ignore = buildIgnores(process.cwd(), function(err, res) {
    floorine.log("all done");
  });
};