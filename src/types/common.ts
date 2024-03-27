import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

import { TransformedModuleConfig } from './module';

export type NumberString = `${number}`;
export type NumberRange = [number, number];
export type BigIntRange = [bigint, bigint];
export type StringRange = [string, string];
export type NumberStringRange = [NumberString, NumberString];
export type StringRecord = Record<string, string>;
export type MoreOrLessString = `>${number}` | `<${number}`;

export interface WalletData {
  privKey: string;
  walletAddress: string;
  id: string;
  okxAddress?: string;
  secondAddress?: string;
  proxy_type?: string;
  proxy?: string;
  index?: number;
}

export interface JsonProxyObject {
  proxy: string;
  proxy_type: string;
}

export interface WalletWithModules {
  wallet: WalletData;
  modules: TransformedModuleConfig[];
}

export interface SavedModules {
  walletsWithModules?: WalletWithModules[];
  route: string;
  isFinished: boolean;
}

export type ProxyAgent = SocksProxyAgent | HttpsProxyAgent<string>;
export type PreparedProxyData = {
  url: string;
} & ProxyObject;
export type OptionalPreparedProxyData = PreparedProxyData | undefined;
export type ProxyObject = {
  proxyType: string;
  proxyIp: string;
  proxyPort: string;
  proxyLogin: string;
  proxyPass: string;
};
export type OptionalProxyObject =
  | (ProxyObject & {
      proxyAgent: ProxyAgent;
    })
  | null;
export interface OptionalProxyAgentConfig {
  httpsAgent?: ProxyAgent | undefined;
}
export interface BaseAxiosConfig extends OptionalProxyAgentConfig {
  timeout?: number;
  signal?: AbortSignal;
  headers: StringRecord;
}

export interface Invite {
  invite_code: string;
  used?: number;
  used_by?: string[];
}

export interface Mail {
  mail: string;
  used?: boolean;
}

export interface Balance {
  wei: bigint;
  int: number;
  decimals: number;
}

export type Cex = 'okx' | 'binance';
