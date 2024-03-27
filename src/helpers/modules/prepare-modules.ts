import { GroupedModules, GroupSettings, ModuleConfig, TransformedModuleConfig } from '../../types';
import { getRandomItemFromArray, getRandomNumber, getRandomNumberRange, limitArray, shuffleArray } from '../utils';
import { PrepareModulesArgs } from './types';

const getOrderedModules = ({
  modules,
  shouldShuffleModules,
  groupSettings,
}: {
  modules: ModuleConfig[];
  shouldShuffleModules: boolean;
  groupSettings: GroupSettings;
}): ModuleConfig[] => {
  const groupedModules = modules.reduce<GroupedModules>((acc, item) => {
    const { indexGroup } = item;

    const isGroupExistInAcc = indexGroup in acc && Array.isArray(acc[indexGroup]);

    if (isGroupExistInAcc) {
      acc[indexGroup]!.push(item);
    } else {
      acc[indexGroup] = [item];
    }

    return acc;
  }, {});

  return Object.entries(groupedModules).reduce<ModuleConfig[]>((acc, [indexGroup, modules]) => {
    const currentGroupSettings = groupSettings[+indexGroup];
    const limit = currentGroupSettings ? getRandomNumber(currentGroupSettings, true) : null;

    let currentModules = modules;
    if (modules?.length > 1 && shouldShuffleModules) {
      currentModules = shuffleArray(modules);
    }

    if (limit !== null) {
      currentModules = limitArray(currentModules, limit);
    }

    return [...acc, ...currentModules];
  }, []);
};

const splitModuleCount = (modules: ModuleConfig[]) => {
  const splitedModules: ModuleConfig[] = [];

  modules.forEach((module) => {
    const count = module.count;

    const countRange = getRandomNumberRange(count);

    for (let i = 0; i < countRange; i++) {
      const moduleCopy = { ...module, count };
      moduleCopy.count = [1, 1];
      splitedModules.push(moduleCopy);
    }

    return;
  });

  return splitedModules;
};

export const prepareModules = ({
  routeSettings,
  defaultModuleConfigs,
  shouldShuffleModules,
}: PrepareModulesArgs): ModuleConfig[] => {
  let modules = routeSettings.modules.reduce<ModuleConfig[]>((acc, cur) => {
    const { delay, moduleName, ...rest } = cur;

    const defaultConfig = defaultModuleConfigs[moduleName] || {};

    const { delay: defaultConfigDelay, ...restDefaults } = defaultConfig;

    const transactionsDelayRange = delay || defaultConfigDelay;

    const moduleConfig = {
      delay: transactionsDelayRange,
      moduleName,
      ...restDefaults,
      ...rest,
    };

    return [...acc, moduleConfig] as ModuleConfig[];
  }, []);

  const shouldSplitModuleCount = routeSettings.splitModuleCount || false;
  if (shouldSplitModuleCount) {
    modules = splitModuleCount(modules);
  }

  modules = getOrderedModules({
    modules,
    shouldShuffleModules,
    groupSettings: routeSettings.groupSettings,
  });

  if (routeSettings.countModules[0] !== 0 && routeSettings.countModules[1] !== 0) {
    const amount = getRandomNumberRange(routeSettings.countModules);

    modules = modules.slice(0, amount);
  }

  return modules;
};

export const getUpdatedGlobalModules = (module: TransformedModuleConfig) => {
  const withSrcAndDestTokens = !!module.srcToken && !!module.destTokens;
  if (module.contractPairs || module.pairs || withSrcAndDestTokens) {
    const splittedModules: TransformedModuleConfig[] = [];

    for (let i = 0; i < module.count; i++) {
      let firstContract, secondContract;
      let firstToken, secondToken;

      if (module.contractPairs) {
        firstContract = module.contractPairs[0];
        secondContract = module.contractPairs[1];
      }
      if (module.pairs) {
        firstToken = module.pairs[0];
        secondToken = module.pairs[1];
      }
      if (withSrcAndDestTokens && !module.pairs) {
        firstToken = module.srcToken;
        secondToken = getRandomItemFromArray(module.destTokens);
      }

      const newBaseModule: TransformedModuleConfig = {
        ...module,
        ...(firstContract &&
          secondContract && {
            contractPairs: [firstContract, secondContract],
          }),
        ...(firstToken &&
          secondToken && {
            pairs: [firstToken, secondToken],
          }),
        count: 1,
      };

      const reversedModule: TransformedModuleConfig = {
        ...newBaseModule,
        isReverse: true,
        ...(firstContract &&
          secondContract && {
            contractPairs: [secondContract, firstContract],
          }),
        ...(firstToken &&
          secondToken && {
            pairs: [secondToken, firstToken],
          }),
        minAndMaxAmount: module.reverseMinAndMaxAmount || [99.99, 99.99],
        usePercentBalance: true,
      };

      splittedModules.push(newBaseModule);

      if (module.reverse) {
        splittedModules.push(reversedModule);
      }
    }

    return splittedModules;
  }

  switch (module.moduleName) {
    case 'okx-withdraw': {
      if (module.randomOkxWithdrawNetworks?.length) {
        const randomOkxWithdrawNetwork = getRandomItemFromArray(module.randomOkxWithdrawNetworks);

        const updatedModule = {
          ...module,
          okxWithdrawNetwork: randomOkxWithdrawNetwork,
        };

        return [updatedModule];
      }

      return [module];
    }
    case 'binance-withdraw': {
      if (module.randomBinanceWithdrawNetworks?.length) {
        const randomBinanceWithdrawNetwork = getRandomItemFromArray(module.randomBinanceWithdrawNetworks);

        const updatedModule = {
          ...module,
          binanceWithdrawNetwork: randomBinanceWithdrawNetwork,
        };

        return [updatedModule];
      }

      return [module];
    }

    default:
      return;
  }
};
export const prepareModulesWithOptions = ({ ...restProps }: PrepareModulesArgs): TransformedModuleConfig[] => {
  return prepareModules(restProps).reduce<TransformedModuleConfig[]>((acc, module) => {
    const count = getRandomNumber(module.count, true);

    const baseModule: TransformedModuleConfig = {
      ...module,
      count,
    };

    const updatedModules = getUpdatedGlobalModules(baseModule) || [baseModule];

    return [...acc, ...updatedModules];
  }, []);
};
