
// Load the SDK for JavaScript
const AWS = require('aws-sdk');
const fetch = require("node-fetch");
const logger = require('pino')({ name: 'Get Applications', level: 'info' });
// Set the region
AWS.config.update({ region: process.env.region });

// Create DynamoDB document client
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

const TABLE_NAME = process.env.table;
const EVENTS_API = process.env.events_api;

async function fetchDetails(url, auth) {
  const results = await fetch(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth
      },
    },
  );
  const resultsJson = await results.json();
  return resultsJson;
}

exports.handler = async (event) => {
  try {
    logger.info(event);
    const { params } = event;
    const { header } = params;

    const exclusiveStartKey = params.querystring.lastEvaluatedKey;
    const { limit } = params.querystring;
    const { eventId } = params.querystring;
    const { artistId } = params.querystring;

    let filterString = '';
    const keyValueMapping = {};

    if (artistId) {
      filterString += ' contains(artistId, :artist) and ';
      keyValueMapping[':artist'] = artistId;
  }
  if (eventId) {
    filterString += ' contains(eventId, :event) and ';
    keyValueMapping[':event'] = eventId;
  }

  filterString = filterString.slice(0, -4);

    const getAllParams = {
      TableName: TABLE_NAME,
    };

    if (exclusiveStartKey) {
      getAllParams.ExclusiveStartKey = {
        applicationId: exclusiveStartKey,
      };
    }
    if (limit && limit > 0) {
      getAllParams.Limit = limit;
    }

    if (filterString && filterString !== '') {
      getAllParams.FilterExpression = filterString;
    }

    if (Object.keys(keyValueMapping).length > 0) {
      getAllParams.ExpressionAttributeValues = keyValueMapping;
    }

    logger.info('Get All Params:');
    logger.info(getAllParams);

    // get all items
    let response = await docClient.scan(getAllParams).promise();

    if (response.errorMessage) {
      throw new Error(response.errorMessage);
    }

    if(artistId){
      for(var i = 0; i < response.Items.length; i++){
        let event = await fetchDetails(`${EVENTS_API}/events/${response.Items[i].eventId}`, header.Authorization);
        response.Items[i].event = event.Item;
      }
    }

    logger.info(response);

    return response;
  } catch (err) {
    logger.info(err);
    return err;
  }
};
