const request = require('request-promise');

class CacheOrReq {
    constructor(cacheTtl, cacheNotFound) {
        this.cacheTtl = cacheTtl || 1000;
        this.cacheNotFound = cacheNotFound;
        this.cache = {};
    }
    getCache(id) {
        if(this.cache[id]) {
            return this.cache[id];
        } else {
            return false;
        }
    }
    setCache(id, data, error) {
        this.cache[id] = {
            lastUpdate: new Date(),
            content: data,
            error: error
        };
    }
    clearCache() {
        this.cache = {};
    }
    get(requestOptions) {
        const self = this;
        const requestOptionsSerialised = JSON.stringify(requestOptions);
        return new Promise((resolve, reject) => {
            const cacheValue = self.getCache(requestOptionsSerialised);
            if(cacheValue) {
                const updateDiff = (new Date() - cacheValue.lastUpdate);
                if(updateDiff >= this.cacheTtl) {
                    self.fetch(requestOptionsSerialised, requestOptions);
                }
                if(cacheValue.content) {
                    resolve(cacheValue);
                } else if(cacheValue.error) {
                    reject(cacheValue);
                }
            } else {
                self.fetch(requestOptionsSerialised, requestOptions).then(() => {
                    // ;-)
                    self.get(requestOptions).then(resolve).catch(reject);
                }).catch(() => {
                    self.get(requestOptions).then(resolve).catch(reject);
                });
            }
        });
    }
    fetch(requestId, requestOptions) {
        const self = this;
        return new Promise((resolve, reject) => {
            request(requestOptions).then((response) => {
                self.setCache(requestId, response, false);
                resolve();
            }).catch((error) => {
                let lastCacheValue = self.getCache(requestId);
                self.setCache(
                    requestId,
                    // if the remote api response with an array but we had already data we shouldn't overwrite it
                    (lastCacheValue && lastCacheValue.content?lastCacheValue.content:false),
                    error
                );
                resolve();
            });
        });
    }
}
module.exports = CacheOrReq;