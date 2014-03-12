#!/usr/bin/env node

var ignore = require("./lib/ignore"),
    floorine = require("floorine");

exports.run = function () {
  floorine.set_log_level("debug");
  floorine.log("starting");
  ignore.writeDefaultIgnores(process.cwd());
  ignore.build(process.cwd(), function(err, i) {
    floorine.log("all done");
  });
};