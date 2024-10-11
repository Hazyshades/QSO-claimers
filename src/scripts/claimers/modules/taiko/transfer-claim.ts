import { getAddress } from 'viem';

import { defaultTokenAbi } from '../../../../clients/abi';
import {
  CLAIM_STATUSES,
  CLAIM_TX_NOT_FOUND,
  DB_NOT_CONNECTED,
  SECOND_ADDRESS_EMPTY_ERROR,
  ZERO_TRANSFER_AMOUNT,
} from '../../../../constants';
import {
  calculateAmount,
  decimalToInt,
  getAxiosConfig,
  getGasOptions,
  getHeaders,
  intToDecimal,
  TransactionCallbackParams,
  TransactionCallbackReturn,
  transactionWorker,
} from '../../../../helpers';
import { TransformedModuleParams } from '../../../../types';
import { TaikoClaimEntity } from '../../db/entities';
import { formatErrMessage, getCheckClaimMessage } from '../../utils';
import { CLAIM_TAIKO_CONTRACT, HEADERS, TAIKO_ABI } from './constants';
import { getBalance, getFinalData, getProofData } from './helpers';

export const execMakeTransferClaimTaiko = async (params: TransformedModuleParams) =>
  transactionWorker({
    ...params,
    startLogMessage: 'Execute make transfer claimed TAIKO...',
    transactionCallback: makeTransferClaimTaiko,
  });

const makeTransferClaimTaiko = async (params: TransactionCallbackParams): TransactionCallbackReturn => {
  const {
    client,
    dbSource,
    minAndMaxAmount,
    usePercentBalance,
    wallet,
    gweiRange,
    gasLimitRange,
    network,
    logger,
    proxyAgent,
  } = params;

  const { walletClient, walletAddress, publicClient, explorerLink } = client;

  let nativeBalance = 0;
  let currentBalance = 0;

  if (!dbSource) {
    return {
      status: 'critical',
      message: DB_NOT_CONNECTED,
    };
  }

  const dbRepo = dbSource.getRepository(TaikoClaimEntity);

  let walletInDb = await dbRepo.findOne({
    where: {
      walletId: wallet.id,
      index: wallet.index,
    },
  });
  if (walletInDb) {
    await dbRepo.remove(walletInDb);
  }
  const headers = getHeaders(HEADERS);
  const config = await getAxiosConfig({
    proxyAgent,
    headers,
  });
  const dataProps = {
    network,
    config,
    walletAddress,
    chainId: client.chainData.id,
  };

  const finalRes = await getFinalData(dataProps);

  const created = dbRepo.create({
    walletId: wallet.id,
    index: wallet.index,
    walletAddress,
    network,
    nativeBalance,
    status: 'New',
  });
  walletInDb = await dbRepo.save(created);

  try {
    const contract = CLAIM_TAIKO_CONTRACT;

    const { int } = await client.getNativeBalance();
    nativeBalance = +int.toFixed(6);

    const proofRes = await getProofData(dataProps);
    if (!proofRes.value || !proofRes.proof) {
      await dbRepo.update(walletInDb.id, {
        status: CLAIM_STATUSES.NOT_ELIGIBLE,
      });

      return {
        status: 'passed',
        message: getCheckClaimMessage(CLAIM_STATUSES.NOT_ELIGIBLE),
      };
    }

    const amountInt = +proofRes.value;
    const amountWei = intToDecimal({
      amount: amountInt,
      decimals: 18,
    });

    const claimed = (await publicClient.readContract({
      address: contract,
      abi: TAIKO_ABI,
      functionName: 'hasClaimed',
      args: [walletAddress, amountWei],
    })) as bigint;

    if (claimed === 0n) {
      await dbRepo.update(walletInDb.id, {
        status: CLAIM_STATUSES.NOT_CLAIMED,
        nativeBalance,
        balance: currentBalance,
      });

      return {
        status: 'passed',
        message: getCheckClaimMessage(CLAIM_STATUSES.NOT_CLAIMED),
      };
    }

    const transferAddress = wallet.transferAddress;
    if (!transferAddress) {
      throw new Error(SECOND_ADDRESS_EMPTY_ERROR);
    }

    const feeOptions = await getGasOptions({
      gweiRange,
      gasLimitRange,
      network,
      publicClient,
    });

    const { currentBalance: currentBalanceInt, currentBalanceWei } = await getBalance(client);
    currentBalance = currentBalanceInt;

    const amountToTransfer = calculateAmount({
      balance: currentBalanceWei,
      isBigInt: true,
      minAndMaxAmount,
      usePercentBalance,
      decimals: 18,
    });

    const isEmptyAmount = amountToTransfer === 0n;

    if (isEmptyAmount) {
      throw new Error(ZERO_TRANSFER_AMOUNT);
    }

    const amountToTransferInt = decimalToInt({
      amount: amountToTransfer,
      decimals: 18,
    });
    logger.info(`Sending ${amountToTransferInt} TAIKO to ${transferAddress}...`);

    const txHash = await walletClient.writeContract({
      address: '0xA9d23408b9bA935c230493c40C73824Df71A0975',
      abi: defaultTokenAbi,
      functionName: 'transfer',
      args: [getAddress(transferAddress), amountToTransfer],
      ...feeOptions,
    });

    await client.waitTxReceipt(txHash);

    await dbRepo.update(walletInDb.id, {
      status: CLAIM_STATUSES.TRANSFER_SUCCESS,
      balance: currentBalance - amountToTransferInt,
      nativeBalance,
    });

    return {
      tgMessage: `Sent ${amountToTransferInt} TAIKO to ${transferAddress}`,
      status: 'success',
      txHash,
      explorerLink,
      message: getCheckClaimMessage(CLAIM_STATUSES.TRANSFER_SUCCESS),
    };
  } catch (err) {
    const errMessage = formatErrMessage(err);
    await dbRepo.update(walletInDb.id, {
      status: CLAIM_STATUSES.TRANSFER_ERROR,
      balance: currentBalance,
      nativeBalance,
      error: errMessage,
    });

    if (errMessage === CLAIM_TX_NOT_FOUND || errMessage === ZERO_TRANSFER_AMOUNT) {
      return {
        status: 'warning',
        message: errMessage,
      };
    }

    throw err;
  }
};