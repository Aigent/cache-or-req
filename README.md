# cache-or-req 

A very simple cache for request-promise operations, primary goal is to return always a value after the first real fetch. The library tried to re-fetch after TTL is reached but returns immediately, the next request within the TTL time will return the updated result. This library should primarily be used for accessing configuration via APIs and ensure that services get always some kind of configuration.

This library is a very simple wrapper around request-promise (https://www.npmjs.com/package/request-promise) basic implementation `request().then().catch()`


---------------------------------------
## Usage

```javascript
const CacheOrReq = require('./CacheOrReq');

let cacheOrReq = new CacheOrReq(
    1000, // refresh cache in background as soon as the item gets older than one second
    1000 * 60 * 60 // delete cache items as soon as they got older than 1 hour without accessing it
);
cacheOrReq.get({ // request-promise options
    url: TEST_URL,
    method: 'GET'
}).then((data) => {
    // data.lastUpdate = new Date();
    // data.content = response from request
}).catch((error) => {
    // error.lastUpdate = new Date();
    // error.error = raw error from request-promise
});

// to clear cache:
cacheOrReq.clearCache();

```
