const { clearHash } = require('../services/cache');

module.exports = async (req, res, next) => {
  await next(); // smart, gonna wait for the route handler to execute and send the response and then the execution comes back to this middleware!!!! And we can safely clean the cache
  clearHash(req.user.id);
}