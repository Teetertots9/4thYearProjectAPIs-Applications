
// Load the SDK for JavaScript
const AWS = require('aws-sdk');
const logger = require('pino')({ name: 'Get Application', level: 'info' });
// Set the region
AWS.config.update({ region: process.env.region });

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const TABLE_NAME = process.env.table;

exports.handler = async (event) => {
  try {
    logger.info(event);
    const { params } = event;

    const { applicationId } = params.path;

    const getItemParams = {
      TableName: TABLE_NAME,
      Key: {
        applicationId,
      },
      ConditionExpression: 'attribute_exists(applicationId)',
    };

    logger.info('Get Item Params:');
    logger.info(getItemParams);

    // get item
    const response = await docClient.get(getItemParams).promise();

    if (response.errorMessage) {
      throw new Error(response.errorMessage);
    } else if (!response.Item) {
      throw new Error('Item not found');
    }

    logger.info(response);

    return response;
  } catch (err) {
    logger.info(err);
    return err;
  }
};
