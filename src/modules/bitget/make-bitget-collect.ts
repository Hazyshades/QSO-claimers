import uniq from 'lodash/uniq';

import { TransactionCallbackParams, TransactionCallbackReturn, transactionWorker } from '../../helpers';
import { Bitget } from '../../managers/bitget';
import { TransformedModuleParams } from '../../types';

export const execMakeBitgetCollect = async (params: TransformedModuleParams) =>
  transactionWorker({
    ...params,
    startLogMessage: 'Execute make transfer from Bitget sub accounts to main...',
    transactionCallback: makeBitgetTransferFromSubAccs,
  });

const makeBitgetTransferFromSubAccs = async (params: TransactionCallbackParams): TransactionCallbackReturn => {
  const { logger, collectTokens } = params;

  const uniqueCollectTokens = uniq(collectTokens);

  const bitget = new Bitget({
    logger,
  });

  await bitget.makeTransferFromSubsToMain({
    tokens: uniqueCollectTokens,
  });

  const mainBalance = await bitget.getAssets();

  const balancesToLog = mainBalance
    .filter(({ coin }: any) => collectTokens?.includes(coin))
    .map(({ coin, available }: any) => `${coin}=${available}`)
    .join(', ');

  const message = `Main acc balances [${balancesToLog}]`;
  return {
    status: 'success',
    tgMessage: message,
    message,
  };
};
