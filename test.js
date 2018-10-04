const TEST_URL = process.env.TEST_URL || 'https://google.com';

const CacheOrReq = require('./CacheOrReq');

let cacheOrReq = new CacheOrReq(1000);

cacheOrReq.get({
    url: TEST_URL,
    method: 'GET'
}).then((data) => {
    console.log('data 1 (direct fetch)', data);

    cacheOrReq.get({
        url: TEST_URL,
        method: 'GET'
    }).then((data) => {
        console.log('data 2 (cached fetch)', data);
    });

    setTimeout(() => {
        cacheOrReq.get({
            url: TEST_URL,
            method: 'GET'
        }).then((data) => {
            console.log('data 3 (same cached fetch)', data);
        });

        setTimeout(() => {
            cacheOrReq.get({
                url: TEST_URL,
                method: 'GET'
            }).then((data) => {
                console.log('data 4 (renewed cache fetch', data);
            });
        }, 1000);
    }, 3000);
}).catch((error) => {
    console.log('data 1 error (direct fetch)', error);

    cacheOrReq.get({
        url: TEST_URL,
        method: 'GET'
    }).then((data) => {
        console.log('data 2 (cached fetch)', data);
    }).catch((error) => {
        console.log('data 2 error (cached fetch)', error);
    });

});



