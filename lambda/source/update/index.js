
// Load the SDK for JavaScript
const AWS = require('aws-sdk');
const logger = require('pino')({ name: 'Update Application', level: 'info' });
// Set the region
AWS.config.update({ region: process.env.region });

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const TABLE_NAME = process.env.table;

exports.handler = async (event) => {
  try {
    logger.info(event);
    const { params, body } = event;
    const { applicationId } = params.path;
    const dateNow = Date.now();

    let updateString = '';
    const keyValueMapping = {};

    body.updatedAt = dateNow;

    Object.keys(body).forEach((key) => {
      updateString += ` ${key} = :${key},`;
      keyValueMapping[`:${key}`] = event.body[key];
    });
    // remove last comma
    updateString = updateString.slice(0, -1);

    const updateItemParams = {
      TableName: TABLE_NAME,
      Key: {
        applicationId,
      },
      UpdateExpression: `set ${updateString}`,
      ExpressionAttributeValues: keyValueMapping,
      ReturnValues: 'UPDATED_NEW',
    };

    // update item
    const response = await docClient.update(updateItemParams).promise();

    if (response.errorMessage) {
      throw new Error(response.errorMessage);
    }

    response.applicationId = applicationId;
    response.Message = 'Item Updated Succesfully';

    logger.info(response);

    return response;
  } catch (err) {
    logger.info(err);
    return err;
  }
};
