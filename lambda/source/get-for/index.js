// Load the SDK for JavaScript
const AWS = require('aws-sdk');
const logger = require('pino')({ name: 'Get Applications For', level: 'info' });
// Set the region
AWS.config.update({ region: process.env.region });

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const TABLE_NAME = process.env.table;

exports.handler = async (event) => {
  try {
    logger.info(event);
    const { params } = event;

    const { eventId } = params.path;

    const exclusiveStartKey = params.querystring.lastEvaluatedKey;
    const { limit } = params.querystring;

    const getMyParams = {
      TableName: TABLE_NAME,
    };

    if (exclusiveStartKey) {
      getMyParams.ExclusiveStartKey = {
        applicationsId: exclusiveStartKey,
      };
    }
    if (limit && limit > 0) {
      getMyParams.Limit = limit;
    }

    logger.info('Get my Params:');
    logger.info(getMyParams);

    // get all items
    let response;
    if (createdBy) {
      getMyParams.IndexName = 'EventIndex';
      getMyParams.KeyConditionExpression = 'eventId = :this_event';
      getMyParams.ExpressionAttributeValues = { ':this_event': eventId };
      if (exclusiveStartKey) {
        getMyParams.ExclusiveStartKey = {
          createdBy: exclusiveStartKey,
        };
      }

      logger.info('Query Params:');
      logger.info(getMyParams);
      // get query items
      response = await docClient.query(getMyParams).promise();
    }

    if (response.errorMessage) {
      logger.error(response.errorMessage);
      throw new Error(response.errorMessage);
    }

    logger.info(response);

    return response;
  } catch (err) {
    logger.error(err);
    return err;
  }
};