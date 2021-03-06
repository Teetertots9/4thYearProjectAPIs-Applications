console.log('Loading function');

const jwt = require('jsonwebtoken');
const request = require('request');
const jwkToPem = require('jwk-to-pem');

/* eslint-disable camelcase */
const { userpool_id } = process.env;
/* eslint-enable camelcase */

/**
 * AuthPolicy receives a set of allowed and denied methods and generates a valid
 * AWS policy for the API Gateway authorizer. The constructor receives the calling
 * user principal, the AWS account ID of the API owner, and an apiOptions object.
 * The apiOptions can contain an API Gateway RestApi Id, a region for the RestApi, and a
 * stage that calls should be allowed/denied for. For example
 * {
 *   restApiId: "xxxxxxxxxx",
 *   region: "us-east-1",
 *   stage: "dev"
 * }
 *
 * let testPolicy = new AuthPolicy("[principal user identifier]", "[AWS account id]", apiOptions);
 * testPolicy.allowMethod(AuthPolicy.HttpVerb.GET, "/users/username");
 * testPolicy.denyMethod(AuthPolicy.HttpVerb.POST, "/pets");
 * context.succeed(testPolicy.build());
 *
 * @class AuthPolicy
 * @constructor
 */
function AuthPolicy(principal, awsAccountId, apiOptions) {
  /**
     * The AWS account id the policy will be generated for. This is used to create
     * the method ARNs.
     *
     * @property awsAccountId
     * @type {String}
     */
  this.awsAccountId = awsAccountId;

  /**
     * The principal used for the policy, this should be a unique identifier for
     * the end user.
     *
     * @property principalId
     * @type {String}
     */
  this.principalId = principal;

  /**
     * The policy version used for the evaluation. This should always be "2012-10-17"
     *
     * @property version
     * @type {String}
     * @default "2012-10-17"
     */
  this.version = '2012-10-17';

  /**
     * The regular expression used to validate resource paths for the policy
     *
     * @property pathRegex
     * @type {RegExp}
     * @default '^\/[/.a-zA-Z0-9-\*]+$'
     */
  this.pathRegex = new RegExp('^[/.a-zA-Z0-9-*]+$');

  // these are the internal lists of allowed and denied methods. These are lists
  // of objects and each object has 2 properties: A resource ARN and a nullable
  // conditions statement.
  // the build method processes these lists and generates the approriate
  // statements for the final policy
  this.allowMethods = [];
  this.denyMethods = [];

  if (!apiOptions || !apiOptions.restApiId) {
    this.restApiId = '*';
  } else {
    this.restApiId = apiOptions.restApiId;
  }
  if (!apiOptions || !apiOptions.region) {
    this.region = '*';
  } else {
    this.region = apiOptions.region;
  }
  if (!apiOptions || !apiOptions.stage) {
    this.stage = '*';
  } else {
    this.stage = apiOptions.stage;
  }
}

/**
 * A set of existing HTTP verbs supported by API Gateway. This property is here
 * only to avoid spelling mistakes in the policy.
 *
 * @property HttpVerb
 * @type {Object}
 */
AuthPolicy.HttpVerb = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  ALL: '*',
};

AuthPolicy.prototype = (function () {
  /**
     * Adds a method to the internal lists of allowed or denied methods. Each object in
     * the internal list contains a resource ARN and a condition statement. The condition
     * statement can be null.
     *
     * @method addMethod
     * @param {String} The effect for the policy. This can only be "Allow" or "Deny".
     * @param {String} he HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {String} The resource path. For example "/pets"
     * @param {Object} The conditions object in the format specified by the AWS docs.
     * @return {void}
     */
  const addMethod = function (effect, verb, resource, conditions) {
    //    if (verb !== '*' && !AuthPolicy.HttpVerb.hasOwnProperty(verb)) {
    if (verb !== '*' && !Object.hasOwnProperty.call(AuthPolicy.HttpVerb, verb)) {
      throw new Error(`Invalid HTTP verb ${verb}. Allowed verbs in AuthPolicy.HttpVerb`);
    }

    if (!this.pathRegex.test(resource)) {
      throw new Error(`Invalid resource path: ${resource}. Path should match ${this.pathRegex}`);
    }

    let cleanedResource = resource;
    if (resource.substring(0, 1) === '/') {
      cleanedResource = resource.substring(1, resource.length);
    }
    const resourceArn = `arn:aws:execute-api:${
      this.region}:${
      this.awsAccountId}:${
      this.restApiId}/${
      this.stage}/${
      verb}/${
      cleanedResource}`;

    if (effect.toLowerCase() === 'allow') {
      this.allowMethods.push({
        resourceArn,
        conditions,
      });
    } else if (effect.toLowerCase() === 'deny') {
      this.denyMethods.push({
        resourceArn,
        conditions,
      });
    }
  };

  /**
     * Returns an empty statement object prepopulated with the correct action and the
     * desired effect.
     *
     * @method getEmptyStatement
     * @param {String} The effect of the statement, this can be "Allow" or "Deny"
     * @return {Object} An empty statement object with the Action, Effect, and Resource
     *                  properties prepopulated.
     */
  const getEmptyStatement = function (effect) {
    const statement = {};
    statement.Action = 'execute-api:Invoke';
    statement.Effect =  effect.substring(0, 1).toUpperCase()
      + effect.substring(1, effect.length).toLowerCase();
    statement.Resource = [];

    return statement;
  };

  /**
     * This function loops over an array of objects containing a resourceArn and
     * conditions statement and generates the array of statements for the policy.
     *
     * @method getStatementsForEffect
     * @param {String} The desired effect. This can be "Allow" or "Deny"
     * @param {Array} An array of method objects containing the ARN of the resource
     *                and the conditions for the policy
     * @return {Array} an array of formatted statements for the policy.
     */
  const getStatementsForEffect = function (effect, methods) {
    const statements = [];

    if (methods.length > 0) {
      const statement = getEmptyStatement(effect);

      for (let i = 0; i < methods.length; i++) {
        const curMethod = methods[i];
        if (curMethod.conditions === null || curMethod.conditions.length === 0) {
          statement.Resource.push(curMethod.resourceArn);
        } else {
          const conditionalStatement = getEmptyStatement(effect);
          conditionalStatement.Resource.push(curMethod.resourceArn);
          conditionalStatement.Condition = curMethod.conditions;
          statements.push(conditionalStatement);
        }
      }

      if (statement.Resource !== null && statement.Resource.length > 0) {
        statements.push(statement);
      }
    }

    return statements;
  };

  return {
    constructor: AuthPolicy,

    /**
         * Adds an allow "*" statement to the policy.
         *
         * @method allowAllMethods
         */
    allowAllMethods() {
      addMethod.call(this, 'allow', '*', '*', null);
    },

    /**
         * Adds a deny "*" statement to the policy.
         *
         * @method denyAllMethods
         */
    denyAllMethods() {
      addMethod.call(this, 'deny', '*', '*', null);
    },

    /**
         * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
         * methods for the policy
         *
         * @method allowMethod
         * @param {String} The HTTP verb for the method, this should ideally come from the
         *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
         * @param {string} The resource path. For example "/pets"
         * @return {void}
         */
    allowMethod(verb, resource) {
      addMethod.call(this, 'allow', verb, resource, null);
    },

    /**
         * Adds an API Gateway method (Http verb + Resource path) to the list of denied
         * methods for the policy
         *
         * @method denyMethod
         * @param {String} The HTTP verb for the method, this should ideally come from the
         *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
         * @param {string} The resource path. For example "/pets"
         * @return {void}
         */
    denyMethod(verb, resource) {
      addMethod.call(this, 'deny', verb, resource, null);
    },

    /**
         * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
         * methods and includes a condition for the policy statement. More on AWS policy
         * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
         *
         * @method allowMethodWithConditions
         * @param {String} The HTTP verb for the method, this should ideally come from the
         *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
         * @param {string} The resource path. For example "/pets"
         * @param {Object} The conditions object in the format specified by the AWS docs
         * @return {void}
         */
    allowMethodWithConditions(verb, resource, conditions) {
      addMethod.call(this, 'allow', verb, resource, conditions);
    },

    /**
         * Adds an API Gateway method (Http verb + Resource path) to the list of denied
         * methods and includes a condition for the policy statement. More on AWS policy
         * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
         *
         * @method denyMethodWithConditions
         * @param {String} The HTTP verb for the method, this should ideally come from the
         *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
         * @param {string} The resource path. For example "/pets"
         * @param {Object} The conditions object in the format specified by the AWS docs
         * @return {void}
         */
    denyMethodWithConditions(verb, resource, conditions) {
      addMethod.call(this, 'deny', verb, resource, conditions);
    },

    /**
         * Generates the policy document based on the internal lists of allowed and denied
         * conditions. This will generate a policy with two main statements for the effect:
         * one statement for Allow and one statement for Deny.
         * Methods that includes conditions will have their own statement in the policy.
         *
         * @method build
         * @return {Object} The policy object that can be serialized to JSON.
         */
    build() {
      if ((!this.allowMethods || this.allowMethods.length === 0)
                && (!this.denyMethods || this.denyMethods.length === 0)) {
        throw new Error('No statements defined for the policy');
      }

      const policy = {};
      policy.principalId = this.principalId;
      const doc = {};
      doc.Version = this.version;
      doc.Statement = [];

      doc.Statement = doc.Statement.concat(getStatementsForEffect.call(this, 'Allow', this.allowMethods));
      doc.Statement = doc.Statement.concat(getStatementsForEffect.call(this, 'Deny', this.denyMethods));

      policy.policyDocument = doc;

      return policy;
    },
  };
}());

function decodeToken(event, context) {
  let token = event.authorizationToken;
  if (token) {
    token = token.substring(token.indexOf(' ') + 1);
  }
  // Fail if the token is not jwt
  const decodedJwt = jwt.decode(token, { complete: true });
  if (!decodedJwt) {
    console.log('Not a valid JWT token');
    context.fail('Not a JWT TOken');
    return null;
  }
  return decodedJwt;
}

function ValidateToken(pems, event, context) {
  let token = event.authorizationToken;
  if (token) {
    token = token.substring(token.indexOf(' ') + 1);
  }
  // Fail if the token is not jwt
  const decodedJwt = jwt.decode(token, { complete: true });
  const { iss } = decodedJwt.payload;

  const n = iss.lastIndexOf('/');
  const resultUserPoolId = iss.substring(n + 1);
  console.log(iss);
  if (!decodedJwt) {
    console.log('Not a valid JWT token');
    context.fail('Not a valid JWT token');
    return;
  }

  // Fail if token is not from your UserPool
  if (decodedJwt.payload.iss !== iss) {
    console.log('invalid issuer');
    context.fail('invalid issuer');
    return;
  }

  // Reject the jwt if it's not an 'Access Token'
  if (decodedJwt.payload.token_use !== 'id') {
    console.log('Not an access token');
    context.fail('Not an access token');
    return;
  }

  // Get the kid from the token and retrieve corresponding PEM
  const { kid } = decodedJwt.header;
  const pem = pems[kid];
  if (!pem) {
    console.log('Invalid access token');
    context.fail('Invalid access token');
    return;
  }

  // Verify the signature of the JWT token to ensure it's really coming from your User Pool

  jwt.verify(token, pem, { issuer: iss }, (err, payload) => {
    if (err) {
      context.fail('Cannot Verify Signature');
    } else {
      // Valid token. Generate the API Gateway policy for the user
      // Always generate the policy on value of 'sub' claim and not for 'username' because
      // username is reassignable
      // sub is UUID for a user which is never reassigned to another user.
      const principalId = payload.sub;

      // Get AWS AccountId and API Options
      const apiOptions = {};
      const tmp = event.methodArn.split(':');
      const apiGatewayArnTmp = tmp[5].split('/');
      const awsAccountId = tmp[4];
      /* eslint-disable prefer-destructuring */
      apiOptions.region = tmp[3];
      /* eslint-enable prefer-destructuring */
      [apiOptions.restApiId, apiOptions.stage] = apiGatewayArnTmp;

      const [, , method] = apiGatewayArnTmp;
      let resource = '/'; // root resource
      if (apiGatewayArnTmp[3]) {
        resource += apiGatewayArnTmp[3];
      }

      // For more information on specifics of generating policy,
      // refer to blueprint for API Gateway's Custom authorizer in Lambda console
      const policy = new AuthPolicy(principalId, awsAccountId, apiOptions);
      const role = '';
      /* eslint-disable camelcase */
      if (resultUserPoolId === userpool_id) {
        /* eslint-enable camelcase */
        console.log('User is in correct pool');
        policy.allowAllMethods();
      } else {
        console.log('User not found in valid user pool, denying all methods');
        policy.denyAllMethods();
      }

      const authResponse = policy.build();
      // Can optionally return a context object of your choosing.
      authResponse.context = {};
      authResponse.context.sub = decodedJwt.payload.sub;
      authResponse.context.username = decodedJwt.payload['cognito:username'];
      authResponse.context.email = decodedJwt.payload.email;
      authResponse.context.role = role;
      authResponse.context.userPoolId = resultUserPoolId;

      context.succeed(authResponse);
    }
  });
}

function handler(event, context) {
  let pems;

  let token = event.authorizationToken;
  if (token) {
    token = token.substring(token.indexOf(' ') + 1);
  }

  console.log('This is my Event');
  console.log(event);
  console.log('This is my headers');
  console.log(event.headers);
  console.log('This is my body');
  console.log(event.body);


  const decodedToken = decodeToken(event, context);
  if (decodedToken) {
    console.log('decoded token');
    console.log(decodedToken);

    console.log('this is my iss');
    const { iss } = decodedToken.payload;
    console.log(iss);

    const n = iss.lastIndexOf('/');
    const result = iss.substring(n + 1);
    console.log(result);

    // Obtain Region from User Pool Substring
    const c1 = iss.lastIndexOf('_');
    const cresult = iss.substring(c1 - 9);
    /* eslint-disable camelcase */
    const aws_region = cresult.substring(0, cresult.indexOf('_'));
    const region = aws_region; // e.g. us-east-1
    /* eslint-enable camelcase */

    // Now that I have a decodedToken, use the iss for setting my UserPool
    const userPoolId = result;

    // Download PEM for your UserPool if not already downloaded
    // if (!pems) {
    // Download the JWKs and save it as PEM
    request({
      url: `${iss}/.well-known/jwks.json`,
      json: true,
    }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        pems = {};
        const { keys } = body;
        for (let i = 0; i < keys.length; i++) {
          // Convert each key to PEM
          const keyId = keys[i].kid;
          const modulus = keys[i].n;
          const exponent = keys[i].e;
          const keyType = keys[i].kty;
          const jwk = { kty: keyType, n: modulus, e: exponent };
          const pem = jwkToPem(jwk);
          pems[keyId] = pem;
        }
        // Now continue with validating the token
        ValidateToken(pems, event, context);
      } else {
        // Unable to download JWKs, fail the call
        context.fail('error');
      }
    });
    // } else {
    //     //PEMs are already downloaded, continue with validating the token
    //     ValidateToken(pems, event, context);
    //
    // }
  } else {
    console.log('Failed to Decode');
  }
}

exports.handler = handler;

