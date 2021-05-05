
const shortid = require('shortid');
// Load the SDK for JavaScript
const AWS = require('aws-sdk');
const logger = require('pino')({ name: 'Create Application', level: 'info' });
// Set the region
AWS.config.update({ region: process.env.region });

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const TABLE_NAME = process.env.table;

exports.handler = async (event) => {
  try {
    logger.info(event);
    const { body } = event;
    const applicationId = shortid.generate();
    const dateNow = Date.now();

    const item = {
      ...body,
      applicationId,
      createdAt: dateNow,
      updatedAt: dateNow,
    };

    const createItemParams = {
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(applicationId)',
    };

    logger.info('Create Item Params:');
    logger.info(createItemParams);

    // create item
    const response = await docClient.put(createItemParams).promise();

    if (response.errorMessage) {
      throw new Error(response.errorMessage);
    }

    response.Item = createItemParams.Item;
    response.Message = 'Item Created Succesfully';

    logger.info(response);

    return response;
  } catch (err) {
    logger.info(err);
    return err;
  }
};
