const lambdaLocal = require('lambda-local');
const path = require('path');

const runTests = async () => {
  try {
    const getResult = await lambdaLocal.execute({
      event: {
        body: {},
        params: {
          path: {},
          querystring: {},
          header: {},
        },
        'stage-variables': {},
        context: {},
      },
      lambdaPath: path.join(__dirname, '../../../lambda/source/get/index.js'),
      profilePath: '~/.aws/credentials',
      profileName: 'default',
      timeoutMs: 3000,
      environment: {
        table: 'dropeta_payments-Table_prod',
      },
    });

    console.log(getResult);

    const createResult = await lambdaLocal.execute({
      event: {
        body: { description: 'Test Create Item Description' },
        params: {
          path: {},
          querystring: {},
          header: {},
        },
        'stage-variables': {},
        context: {},
      },
      lambdaPath: path.join(__dirname, '../../../lambda/source/create/index.js'),
      profilePath: '~/.aws/credentials',
      profileName: 'default',
      timeoutMs: 3000,
      environment: {
        table: 'dropeta_payments-Table_prod',
      },
    });

    console.log(createResult);

    const itemId = createResult.Item.id;

    const getItemResult = await lambdaLocal.execute({
      event: {
        body: {},
        params: {
          path: {
            id: itemId,
          },
          querystring: {},
          header: {},
        },
        'stage-variables': {},
        context: {},
      },
      lambdaPath: path.join(__dirname, '../../../lambda/source/get-item/index.js'),
      profilePath: '~/.aws/credentials',
      profileName: 'default',
      timeoutMs: 3000,
      environment: {
        table: 'dropeta_payments-Table_prod',
      },
    });

    console.log(getItemResult);

    const updateResult = await lambdaLocal.execute({
      event: {
        body: { description: 'Test Update Item Description' },
        params: {
          path: {
            id: itemId,
          },
          querystring: {},
          header: {},
        },
        'stage-variables': {},
        context: {},
      },
      lambdaPath: path.join(__dirname, '../../../lambda/source/update/index.js'),
      profilePath: '~/.aws/credentials',
      profileName: 'default',
      timeoutMs: 3000,
      environment: {
        table: 'dropeta_payments-Table_prod',
      },
    });

    console.log(updateResult);

    const deleteResult = await lambdaLocal.execute({
      event: {
        body: {},
        params: {
          path: {
            id: itemId,
          },
          querystring: {},
          header: {},
        },
        'stage-variables': {},
        context: {},
      },
      lambdaPath: path.join(__dirname, '../../../lambda/source/delete/index.js'),
      profilePath: '~/.aws/credentials',
      profileName: 'default',
      timeoutMs: 3000,
      environment: {
        table: 'dropeta_payments-Table_prod',
      },
    });

    console.log(deleteResult);
  } catch (error) {
    console.log(error);
  }
};

runTests();
