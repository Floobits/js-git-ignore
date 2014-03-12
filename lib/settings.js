_ = require('lodash');

module.exports = {
  IGNORE_FILES: [".gitignore", ".hgignore", ".flignore", ".flooignore"],
  WHITE_LIST: _.union(this.IGNORE_FILES, [".floo", ".idea"]),
  DEFAULT_IGNORES: ["extern", "node_modules", "tmp", "vendor", ".idea/workspace.xml", ".idea/misc.xml", ".git"],
  MAX_FILE_SIZE: 1024 * 1024 * 5
};