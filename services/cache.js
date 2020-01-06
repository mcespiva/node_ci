const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');

const client = redis.createClient('redis://127.0.0.1:6379');
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || '');

  return this;
};

mongoose.Query.prototype.exec = async function() {
  
  if(!this.useCache) {
    return await exec.apply(this, arguments);
  }

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  const cachedValue = await client.hget(this.hashKey, key);

  if (cachedValue) {
    const doc = JSON.parse(cachedValue);
    const result = Array.isArray(doc) ? doc.map(r => new this.model(r)) : new this.model(doc);
    return result;
  }

  const result = await exec.apply(this, arguments);
  
  client.hmset(this.hashKey, key, JSON.stringify(result), 'EX', 10);

  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
}