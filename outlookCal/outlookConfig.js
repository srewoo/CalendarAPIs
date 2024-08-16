// OutlookConfig.js
const path = require('path');

module.exports = {
    clientId : '0881090e-19e2-459e-8493-2bac0054c929',
     tenantId :'5f41353a-e0ce-45f6-afad-92b9247e2463',
     clientSecret : 'KfU8Q~FZLl64GWhN-qQiGt3AqLqbZ6myhs4o8bq-',
    redirectUri: 'http://localhost',
    tokenCachePath: path.join(__dirname, 'tokenCache.json')
};
