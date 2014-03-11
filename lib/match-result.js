module.exports = {
  /** The file is not ignored, due to a rule saying its not ignored. */
  NOT_IGNORED : 1,

  /** The file is ignored due to a rule in this node. */
  IGNORED : 2,

  /** The ignore status is unknown, check inherited rules. */
  CHECK_PARENT : 3
};