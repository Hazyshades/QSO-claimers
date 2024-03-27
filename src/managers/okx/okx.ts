import { createHmac } from 'crypto';

import axios, { AxiosError } from 'axios';
import { okx } from 'ccxt';

import { OKX } from '../../_inputs/settings';
import settings from '../../_inputs/settings/settings';
import { EMPTY_BALANCE_ERROR, LOW_AMOUNT_ERROR, OKX_WL_ERROR } from '../../constants';
import { chunkArray, getRandomNumber, prepareProxy, retry, sleep } from '../../helpers';
import type { LoggerData, LoggerType } from '../../logger';
import { OKX_FEE_NETWORK_MAP, OKX_NETWORK_MAP } from '../../modules/okx-withdraw/constants';
import { OkxNetworks, Token, Tokens } from '../../types';
import {
  CheckWithdrawal,
  GetAuthHeadersProps,
  GetSignatureProps,
  OkxApiSecrets,
  OkxConstructor,
  OkxGlobal,
  OkxRandom,
  TransferBalance,
  TransferBalanceFromSubToMain,
  TransferBalanceToAnotherAcc,
} from './types';

interface ExecWithdrawParams {
  walletAddress: string;
  token: Token | Tokens;
  network: OkxNetworks;
  minAmount?: number;
}

const INTERNAL_TRANSFER = '3';
const ON_CHAIN = '4';
const FUNDING_ACCOUNT = '6';
const TRADING_ACCOUNT = '18';
const OKX_DOMAIN = 'https://www.okx.com';
const OKX_CONFIG = OKX as OkxGlobal;

// Singleton
export class Okx {
  private readonly logger?: LoggerType;
  private readonly okxController: okx;
  // global config
  private readonly random: OkxRandom | undefined;
  private readonly amount: number | undefined;
  private readonly secrets: OkxApiSecrets;
  private readonly proxy: string;
  // OKX singleton instance
  private static instance: Okx | null = null;
  private readonly hideExtraLogs: boolean;

  constructor({ secrets, logger, random, amount, hideExtraLogs }: OkxConstructor) {
    this.logger = logger;
    this.secrets = secrets || this.getAccountOKX();
    this.proxy = OKX_CONFIG.proxy;
    this.random = random;
    this.amount = amount;
    this.hideExtraLogs = hideExtraLogs || false;
    this.okxController = this.setOkxController();
  }

  public static getInstance(props: OkxConstructor): Okx {
    if (!Okx.instance) {
      Okx.instance = new Okx(props);
    }
    return Okx.instance;
  }

  private getChainName(token: string, network: string) {
    return `${token}-${network}`;
  }

  private getWithdrawAmount(): string {
    if (this.amount) {
      return `${this.amount}`;
    }

    if (!this.random) {
      return '';
    }
    const [randomFrom, randomTo] = this.random.withdrawToAmount;

    return getRandomNumber([randomFrom, randomTo]).toFixed(5);
  }

  private setOkxController() {
    const okxController = new okx({
      ...this.secrets,
      enableRateLimit: true,
    });

    if (this.proxy && settings.useProxy) {
      const proxyObject = prepareProxy({
        proxy: this.proxy,
        proxy_type: 'HTTP',
      });

      if (proxyObject) {
        okxController.https_proxy = proxyObject.url;
      }
    }

    return okxController;
  }

  private async authGuard() {
    try {
      this.okxController.checkRequiredCredentials();
    } catch (error) {
      const e = error as Error;
      this.logger?.info(e.message, {
        action: 'authGuard',
        status: 'failed',
      });
      throw new Error(e.message);
    }
  }

  async checkNetConnection(token: string, network: string, sleepTime: number = 300000) {
    let isAvailable = false;

    while (!isAvailable) {
      // todo type data
      const networkInfo: any = await this.okxController.fetchCurrencies();
      isAvailable = networkInfo?.[token]?.networks?.[network]?.info.canWd;

      if (!isAvailable) {
        this.logger?.error(
          `Withdraw is unavailable for this moment. Next attempt will be in ${sleepTime / 60} minutes`,
          {
            action: 'checkNetConnection',
            status: 'failed',
          }
        );
        await sleep(sleepTime);
      }
    }
  }

  async getBalance() {
    return this.okxController.fetchBalance();
  }
  async getWithdrawFee(token: string, network: string, inputNetwork: OkxNetworks) {
    try {
      // todo add types for this fetcher
      const feesData = (await this.okxController.fetchDepositWithdrawFees([token])) as any;
      const tokenNetworks = feesData[token]?.networks;
      const feeNetwork = OKX_FEE_NETWORK_MAP[inputNetwork];

      const feeInfo = tokenNetworks?.[feeNetwork] || tokenNetworks?.[network] || tokenNetworks?.[token];

      if (!feeInfo) {
        throw new Error('No fee info');
      }

      return feeInfo.withdraw.fee;
    } catch (error) {
      const withdrawFees = this.random?.withdrawFees;
      if (!withdrawFees) {
        this.logger?.info(`${error}. withdrawFees can not be empty.`, {
          action: 'getWithdrawFee',
          status: 'failed',
        });
      }

      this.logger?.info(`${error}. Script will use withdraw fee from config - ${withdrawFees}.`, {
        action: 'getWithdrawFee',
        status: 'in progress',
      });

      return withdrawFees;
    }
  }

  async execWithdraw({ walletAddress, token, network, minAmount }: ExecWithdrawParams): Promise<string> {
    const logTemplate: LoggerData = {
      action: 'execOkxWithdraw',
      status: 'in progress',
    };
    const lowAmountErrMessage = 'Withdrawal amount is lower than the lower limit';

    try {
      await this.authGuard();

      const okxNetwork = OKX_NETWORK_MAP[network];
      const chainName = this.getChainName(token, okxNetwork);

      const withdrawFee = await this.getWithdrawFee(token, okxNetwork, network);
      const amount = `${+this.getWithdrawAmount() + withdrawFee}`;

      if (minAmount && +amount < minAmount) {
        throw new Error(lowAmountErrMessage);
      }
      this.logger?.info(`Withdrawing ${(+amount).toFixed(5)} ${token} in ${chainName}`, logTemplate);

      const res = await retry({
        callback: () =>
          this.okxController.withdraw(token, amount, walletAddress, {
            toAddress: walletAddress,
            chainName,
            dest: ON_CHAIN,
            fee: withdrawFee,
            pwd: '-',
            amt: amount,
            network: okxNetwork,
          }),
        baseDelayMs: 5,
        maxAttempts: 1,
      });

      if (!res?.id) {
        throw new Error('Unable to execute withdrawal');
      }

      this.logger?.success(
        `${(+amount).toFixed(5)} ${token} were send. We are waiting for the withdrawal from OKX, relax...`,
        {
          ...logTemplate,
          status: 'succeeded',
        }
      );

      return res.id;
    } catch (e) {
      const errorMessage = (e as Error)?.message ?? 'unknown error';

      const whiteListError = errorMessage.includes('address is not allowlisted');
      if (whiteListError) {
        throw new Error(OKX_WL_ERROR);
      }

      if (errorMessage.includes(lowAmountErrMessage)) {
        throw new Error(LOW_AMOUNT_ERROR);
      }

      if (errorMessage.includes(EMPTY_BALANCE_ERROR)) {
        throw new Error(EMPTY_BALANCE_ERROR);
      }

      throw new Error(errorMessage);
    }
  }
  async checkWithdrawal({ id, publicClient }: CheckWithdrawal): Promise<boolean> {
    await this.authGuard();

    const data = await this.okxController.fetchWithdrawal(id);

    if (!data) {
      return false;
    }

    const txHash = data.info?.txId || data.txid;

    if (txHash) {
      const txData = await publicClient.getTransaction({
        hash: txHash,
      });

      if (!txData) {
        return false;
      }
    }

    return true;
  }
  private getAccountOKX(): OkxApiSecrets {
    const accountSecret = OKX_CONFIG.accounts[OKX_CONFIG.accountName];

    if (!accountSecret) {
      throw new Error('OKX account was not found');
    }

    return accountSecret;
  }

  // =========== Transafer from Sub Accounts to Main ===========
  private getSignature({ timeStamp, method, requestPath, body = '' }: GetSignatureProps): string {
    const message = timeStamp + method.toUpperCase() + requestPath + body;
    const hmac = createHmac('sha256', this.secrets.secret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  private getAuthHeaders({ requestPath, method = 'GET', body = '' }: GetAuthHeadersProps) {
    const timeStamp = new Date().toISOString();

    return {
      'OK-ACCESS-TIMESTAMP': timeStamp,
      'OK-ACCESS-KEY': this.secrets.apiKey,
      'OK-ACCESS-SIGN': this.getSignature({ timeStamp, method, requestPath, body }),
      'OK-ACCESS-PASSPHRASE': this.secrets.password,
    };
  }

  private async transferBalanceFromSubToMain({ symbol, amount, subAccName }: TransferBalanceFromSubToMain) {
    try {
      const requestPath = '/api/v5/asset/transfer';
      const body = {
        ccy: symbol,
        amt: amount,
        from: FUNDING_ACCOUNT,
        to: FUNDING_ACCOUNT,
        type: '2',
        subAcct: subAccName,
      };
      const headers = this.getAuthHeaders({ requestPath, method: 'POST', body: JSON.stringify(body) });

      const response = await axios.post(`${OKX_DOMAIN}${requestPath}`, body, {
        headers,
      });

      const data = response.data.data;
      if (!data.length) {
        throw new Error(`Unable to transfer ${symbol} balance successfully: ${response.data.msg}`);
      }
      const { amt } = data[0];

      this.logger?.success(
        `${(+amt).toFixed(5)} ${symbol} has been sent from sub-account [${subAccName}] to main account`,
        {
          status: 'succeeded',
        }
      );
    } catch (error) {
      this.logger?.error(`Unable to transfer ${symbol}: ${this.getTransferErrorMessage(error)}`);
    }
  }
  private async transferBalanceFromTradingToFunding({ symbol, amount }: TransferBalance) {
    try {
      const requestPath = '/api/v5/asset/transfer';
      const body = {
        ccy: symbol,
        amt: amount,
        from: TRADING_ACCOUNT,
        to: FUNDING_ACCOUNT,
        type: '0',
      };
      const headers = this.getAuthHeaders({ requestPath, method: 'POST', body: JSON.stringify(body) });

      const response = await axios.post(`${OKX_DOMAIN}${requestPath}`, body, {
        headers,
      });

      const data = response.data.data;
      if (!data.length) {
        throw new Error(`Unable to transfer ${symbol} balance successfully: ${response.data.msg}`);
      }
      const { amt } = data[0];

      this.logger?.success(`${(+amt).toFixed(5)} ${symbol} has been sent from trading account to main account`, {
        status: 'succeeded',
      });
    } catch (error) {
      this.logger?.error(`Unable to transfer ${symbol}: ${this.getTransferErrorMessage(error)}`);
    }
  }
  private async transferBalanceToAnotherAcc({ symbol, amount, email }: TransferBalanceToAnotherAcc) {
    try {
      const requestPath = '/api/v5/asset/withdrawal';
      const body = {
        ccy: symbol,
        amt: amount,
        fee: '0',
        // to: FUNDING_ACCOUNT,
        toAddr: email,
        dest: INTERNAL_TRANSFER,
      };
      const headers = this.getAuthHeaders({ requestPath, method: 'POST', body: JSON.stringify(body) });

      const response = await axios.post(`${OKX_DOMAIN}${requestPath}`, body, {
        headers,
      });

      const data = response.data.data;
      if (!data.length) {
        throw new Error(`Unable to transfer ${symbol} balance successfully: ${response.data.msg}`);
      }
      const { amt } = data[0];
      this.logger?.success(`${(+amt).toFixed(5)} ${symbol} has been sent from current account to collect account`, {
        status: 'succeeded',
      });
    } catch (error) {
      this.logger?.error(`Unable to transfer ${symbol}: ${this.getTransferErrorMessage(error)}`);
    }
  }

  private async getSubAccountBalances(subAccName: string) {
    const requestPath = `/api/v5/asset/subaccount/balances?subAcct=${subAccName}`;

    const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
      headers: this.getAuthHeaders({ requestPath }),
    });

    return response.data.data;
  }
  async getMainAccountBalanceByToken(tokenName: string = 'ETH') {
    const requestPath = `/api/v5/asset/balances?ccy=${tokenName}`;

    const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
      headers: this.getAuthHeaders({ requestPath }),
    });

    return response.data.data;
  }
  async getMainAccountBalances() {
    const requestPath = '/api/v5/asset/balances';

    const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
      headers: this.getAuthHeaders({ requestPath }),
    });

    return response.data.data;
  }
  async getMainAccountCurrencies(): Promise<string[]> {
    const requestPath = '/api/v5/asset/currencies';

    const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
      headers: this.getAuthHeaders({ requestPath }),
    });

    const currencies = response.data.data?.map(({ ccy }: { ccy: string }) => ccy) || [];

    return [...new Set([...currencies])];
  }
  async getTradingAccountBalances() {
    const currencies = await this.getMainAccountCurrencies();

    if (!currencies.length) {
      return [];
    }

    const chunkedCurrencies = chunkArray(currencies, 20);

    const res = [];
    for (const chunk of chunkedCurrencies) {
      const requestPath = `/api/v5/account/balance?ccy=${chunk.join(',')}`;

      const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
        headers: this.getAuthHeaders({ requestPath }),
      });

      const data = response.data.data || [];

      res.push(...data);

      await sleep(0.5);
    }

    return res.map(({ details }: any) => details).flat();
  }
  async getTradingAccountBalanceByToken(tokenName: string = 'ETH') {
    const requestPath = `/api/v5/account/balances?ccy=${tokenName}`;

    const response = await axios.get(`${OKX_DOMAIN}${requestPath}`, {
      headers: this.getAuthHeaders({ requestPath }),
    });

    return response.data.data;
  }

  async transferFromSubAccs(tokens?: Tokens[]) {
    const subAccounts = await this.okxController.privateGetUsersSubaccountList();

    if (!subAccounts.data) {
      throw new Error('We can not get sub accounts from OKX');
    }
    if (subAccounts.data.length === 0) {
      return;
    }

    for (const { label: subAccName } of subAccounts.data) {
      try {
        const balances = await this.getSubAccountBalances(subAccName);

        if (!balances.length) {
          continue;
        }

        this.logger?.info(
          `Balance of ${subAccName}: ${balances.map(({ availBal, ccy }: any) => `${ccy}=${(+availBal).toFixed(5)}`)}`
        );

        for (const { availBal, ccy } of balances) {
          if (!tokens?.length || tokens.includes(ccy)) {
            await this.transferBalanceFromSubToMain({ amount: availBal, subAccName, symbol: ccy });

            await sleep(1);
          }
        }
      } catch (error) {
        this.logger?.error(this.getTransferErrorMessage(error));
      }
    }
  }
  async transferFromTradingAcc(tokens?: Tokens[]) {
    try {
      const balances = await this.getTradingAccountBalances();

      if (!balances.length) {
        return;
      }

      this.logger?.info(
        `Balance of trading account: ${balances.map(({ availBal, ccy }: any) => `${ccy}=${(+availBal).toFixed(5)}`)}`
      );

      for (const { availBal, ccy } of balances) {
        if (!tokens?.length || tokens.includes(ccy)) {
          await this.transferBalanceFromTradingToFunding({ amount: availBal, symbol: ccy });

          await sleep(1);
        }
      }
    } catch (error) {
      this.logger?.error(this.getTransferErrorMessage(error));
    }
  }
  async transferToAnotherAcc(email: string, tokens?: Tokens[]) {
    try {
      const balances = await this.getMainAccountBalances();

      if (!balances.length) {
        return;
      }

      for (const { availBal, ccy } of balances) {
        if (!tokens?.length || tokens.includes(ccy)) {
          await this.transferBalanceToAnotherAcc({ email, amount: availBal, symbol: ccy });

          await sleep(1);
        }
      }
    } catch (error) {
      this.logger?.error(this.getTransferErrorMessage(error));
    }
  }
  private getTransferErrorMessage(error: unknown) {
    let errMsg = '';

    if (error instanceof AxiosError) {
      errMsg = error.response?.data?.msg;
    }

    const err = error as Error;
    if (!errMsg) {
      errMsg = err.message;
    }

    if (errMsg.includes('Parameter amt error')) {
      errMsg = 'Withdrawal amount is lower than the lower limit';
    }
    return errMsg;
  }
}
