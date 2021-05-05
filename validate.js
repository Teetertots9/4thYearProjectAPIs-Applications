const SwaggerParser = require('swagger-parser');

const { STAGE } = process.env;
const API = `./swagger/${STAGE}/swagger.yaml`;

SwaggerParser.validate(API, (err, api) => {
  if (err) {
    throw err;
  } else {
    console.log('Swagger Validated');
    console.log('API name: %s, Version: %s', api.info.title, api.info.version);
  }
});
