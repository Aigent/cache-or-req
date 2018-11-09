const request = require('request-promise');

class CacheOrReq {
    constructor(cacheTtl, cacheNotFound) {
        this.cacheTtl = cacheTtl || 1000;
        this.cache = {};
        this.locks = {};
        this.callbacks = {
            fetchSuccess: [],
            fetchError: [],
            update: [],
            miss: [],
            hit: []
        };
    }

    /**
     * adds a callback to the list which gets called if an event happens, the following types are possible:
     * - fetchSuccess
     * - fecthError
     * - update
     * - miss
     * - hit
     *
     * @param type
     * @param cb
     */
    addCallback(type, cb) {
        if(this.callbacks[type]) {
            this.callbacks[type].push(cb);
        } else {
            throw new Error('invalid callback type ' + type);
        }
    }

    /**
     * triggers an event and calls corresponding configured callbakcs if there are any
     *
     * @param type
     * @param data
     */
    triggerEvent(type, data) {
        if(this.callbacks[type] && this.callbacks[type].length > 0) {
            for(let cb of this.callbacks[type]) {
                cb(data);
            }
        }
    }

    /**
     * returns the local cache version by given cache id
     *
     * @param id
     * @returns {*}
     */
    getCache(id) {
        if(this.cache[id]) {
            return this.cache[id];
        } else {
            return false;
        }
    }

    /**
     * sets cache with request or error response
     *
     * @param id
     * @param data
     * @param error
     */
    setCache(id, data, error) {
        this.cache[id] = {
            lastUpdate: new Date(),
            content: data,
            error: error
        };
    }

    /**
     * locks a given id and returns true if lock was successful
     *
     * @param id
     * @returns {boolean}
     */
    lock(id) {
        if(!this.locks[id]) {
            this.locks[id] = new Date();
            return true;
        }
        return false;
    }

    /**
     * unlocks a given id and returns true if it was locked
     *
     * @param id
     * @return {boolean}
     */
    unlock(id) {
        if(this.locks[id]) {
            this.locks[id] = false;
            return true;
        }
        return false
    }

    /**
     * clears complete cache and locks
     *
     */
    clearCache() {
        this.cache = {};
        this.locks = {};
    }

    /**
     * returns data by given request options in the following manner:
     * - if the first time called the promise will resolved after the data was fetched
     * - all calls after that with the same request options will resolve with a previously fetched and in the object instance stored version
     * - if the previous version is outdated, determined by the cacheTtl configuration value, it will start fetching the data based on the
     *   request options and as soon as the request is finished all calls to get will return the new version
     *
     * This behaviour allows to have a fast and liable service even though if underlaying services are not available and/or slow
     *
     * @param requestOptions
     * @returns {Promise<any>}
     */
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
                self.triggerEvent('hit', {requestId: requestOptionsSerialised});
            } else {
                self.fetch(requestOptionsSerialised, requestOptions).then(() => {
                    // ;-)
                    self.get(requestOptions).then(resolve).catch(reject);
                }).catch(() => {
                    self.get(requestOptions).then(resolve).catch(reject);
                });
                self.triggerEvent('miss', {requestId: requestOptionsSerialised});
            }
        });
    }

    /**
     * fetchs the data based on the request options. It ensures that the same request is just fetched once at the same time.
     *
     * @todo add awareness of remote hosts and throttling reuqests to avoid DoS behaviour as soon as a underlaying service is up after downtime
     *
     * @param requestId
     * @param requestOptions
     * @returns {Promise<any>}
     */
    fetch(requestId, requestOptions) {
        const self = this;
        return new Promise((resolve, reject) => {
            if(self.lock(requestId)) {
                request(requestOptions).then((response) => {
                    self.setCache(requestId, response, false);
                    resolve();
                    self.triggerEvent('fetchSuccess', {response: response, requestId: requestId});
                    self.unlock(requestId);
                }).catch((error) => {
                    let lastCacheValue = self.getCache(requestId);
                    self.setCache(
                        requestId,
                        // if the remote api response with an array but we had already data we shouldn't overwrite it
                        (lastCacheValue && lastCacheValue.content ? lastCacheValue.content : false),
                        error
                    );
                    resolve();
                    self.triggerEvent('fetchError', {error: error, requestId: requestId});
                    self.unlock(requestId);
                });
            } else {
                resolve();
            }
        });
    }
}
module.exports = CacheOrReq;