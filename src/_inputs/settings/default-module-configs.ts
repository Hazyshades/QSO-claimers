import { DefaultModuleConfigs } from '../../types';

// ВНИМАНИЕ! Вам не обязательно в роутах дублировать настройки, которые уже указали в default-module-configs.ts, так как в первую очередь мы настройки берём от сюда,
// а уже потом берём их для каждого роута отдельно, но вы так же можете и указывать все настройки в роуте - это не будет ошибкой. Работайте, как удобно.
// Нельзя добавлять новые поля в данном файле! Изменять можно только существующие!
// Внутри роутов, можно создавать поля исходя из тех, которые указаны в этом конфиге.

// ============================ DESCRIPTION ============================
// Описание общих настроек внутри модулей
// avnu: { - Название модуля. Внутри роутов, называется moduleName
//   count: [1, 1], - Количество повторений данного модуля в диапазоне ОТ и ДО
//   delay: [30, 60], - Задержка между транзакций внутри одного модуля ОТ и ДО
//   indexGroup: 1, - Индекс, который нам помогает понять в какой последовательности вы хотите запускать модули, а
//                    так же позволяет перемешивать все модули между собой с одинаковым индексом.
//
//   minAndMaxAmount: [0.2, 0.3], - Количество токенов, которое будет использоваться в работе в диапазоне ОТ и ДО
//   reverseMinAndMaxAmount: [99.99, 99.99], - Процентов токенов в диапазоне ОТ и ДО, которое будет использовано при обратном свапе. [99.99, 99.99] - дефолтное значение
//   usePercentBalance: true, - Нужно ли успользовать проценты, вместо целых чисел.
//                              Если стоит true, тогда minAndMaxAmount значения будут использоваться как проценты! minAndMaxAmount: [80, 90] - от 80% до 90%
//
//   minNativeBalance: 0.0000001, - Минимальный баланс, который должен быть для выполнения профиля.
//                                  Мы смотрим на нативный баланс сети и выполняем модуль, только если баланс выше значения, которое вы указали
//
//   maxGas: ['eth', 25], - Максимальный gwei в конкретной сети, если gwei будет выше указанного значение, тогда скрипт будет ждать, пока он не опустится
//   gweiRange: [0, 0], - Диапазон вашего кастомного gwei, который будет применяться для транзакций
//   gasLimitRange: [0, 0], - Диапазон вашего кастомного gas limit, который будет применяться для транзакций
//   pairs: ['ETH', 'USDC'], - Пара токенов, которые будут использоваться. Из какого токена и в какой токен нужно провести транзакцию.
//   reverse: true, - Выполняет точно такую же транзакцию, только наоборот. Если вы свапали например 0.1 ETH в USDC, тогда ~190 USDC вернётся обрано в 0.1 ETH.
//   network: 'bsc', - Сеть в которой будет выполняться модуль
//
//   contractAddress: 'native', - Адрес контракта, который будет использоваться. 'native' или '0x92815....'
//   contractPairs: ['0xEe....eeE', '0x335...f4'], - Пара контрактов, которая будет использоваться в работе.
//                                                   Первый контракт это ИЗ которого делаете swap, а второй В который оно прийдёт
//
//   stopWalletOnError: true, - Если поле стоит в true, значит при получении ошибки внутри модуля скрипт остановит
//                              своё выполнение для этого кошелька и возьмёт следующий кошелёк
//   stopModulesOnError: ['moduleName1', 'moduleName2'] - Если в поле указанны некоторые модули и модуль, для которого оно задано,
//                                                        падает с ошибкой, то все следующие указанные модули, будут пропущены
// }

// Конфиг, который будет применяться для каждого модуля по умолчанию в случае, если вы пропусили какие-то параметры в роуте

export const defaultModuleConfigs: DefaultModuleConfigs = {
  // ============== General ==============
  'balance-checker': {
    count: [1, 1],
    indexGroup: 0,

    // Сеть в которой будет выполняться модуль (bsc | opBNB | eth | optimism | zkSync | arbitrum | polygon | zora | base )
    network: 'bsc',

    // Контракт токена для проверки баланса или используйте 'native' для проверки баланса нативного токена указанной сети
    contractAddress: 'native',
  },
  'check-native-balance': {
    count: [1, 1],
    indexGroup: 0,

    // Сеть в которой будет выполняться модуль (bsc | opBNB | eth | optimism | zkSync | arbitrum | polygon | zora | base )
    network: 'arbitrum',

    stopWalletOnError: true,
    minNativeBalance: 0.0000001,
  },

  'transfer-token': {
    count: [1, 1],
    indexGroup: 1,

    // Диапазон для трансфера
    minAndMaxAmount: [0.0001, 0.0003],
    usePercentBalance: false,

    // Сеть в которой будет выполняться модуль (bsc | opBNB | eth | optimism | zkSync | arbitrum | polygon | zora | base )
    network: 'bsc',

    // Контракт токена для трансфера или используйте 'native' для трансфера нативного токена указанной сети
    contractAddress: 'native',

    // Модуль будет выполнен, только, если баланс указанного токена будет выше данного значения
    minTokenBalance: 0,

    gweiRange: [0, 0],
  },
  'top-up-eth-mainnet': {
    // Модуль для пополнения сети Ethereum через оффициальный мост ZkSync Era. Стоимость пополнения ~0.8$
    count: [1, 1],
    indexGroup: 0,

    // Если баланс кошелька в ETH будет ниже этого значения, только тогда будет выполнен модуль
    // Если вам на балансе нужно всего например 0.005 ETH в сети Ethereum, тогда укажите здесь это количество,
    // чтобы мы ничего не делали с этим кошельком при повторном запуске!
    minNativeBalance: 0.005,

    // Учитывать ли баланс в ZkEra при выводе с OKX
    // Если true, то вывод с OKX будет выполнен только, если баланс ниже minDestNativeBalance
    checkZkEraBalance: false,
    minDestNativeBalance: 0.01,

    reservePercentNetworkFee: 2,

    // Количество ETH, которые будут использованы для ZkEraBridge
    // Значение этого поля так же связанно с minAmount, так как ZkSync Era позволяет отправлять минимум 0.01 ETH!
    // Если вдруг они поменяют в будущем минимальную сумму для отправки, вы сможете изменить minAmount
    zkEraBridgeAmount: [0.01, 0.011],

    // Баланс, который должен оставаться в ZkSync, после окончания модуля
    balanceToLeft: [0.015, 0.017],

    // Модуль будет выполнен, только, если высчитанный minAndMaxAmount вместе с fee OKX будет больше указанного значения
    // Это значение не трогайте! Это минимум, который должен использоваться, чтобы вам дошли средства без каких либо проблем
    minAmount: 0.01,

    // Будет делать вывод рандомно из одной из перечисленных бирж
    randomCex: ['okx', 'binance'],

    // Сеть, которая будет использована для вывода с OKX и бриджа
    // Это значение не трогайте!
    network: 'zkSync',
  },
  'okx-collect': {
    count: [1, 1],
    indexGroup: 0,

    // Аккаунты для которых будет выполняться модуль
    // Формат: ['accountName1', 'accountName2', ...]
    // Названия должны соответствовать таковым в global.js, в противном случае они будут проигнорированы
    // Так-же можно указать 'all' и тогда модуль выполнится для всех аккаунтов в global.js
    okxAccounts: 'all',
  },
  // ============== Withdraws ==============
  'binance-withdraw': {
    count: [1, 1],
    indexGroup: 0,

    // Сеть из которой нужно делать вывод с Binance. bsc | opBNB | polygon
    binanceWithdrawNetwork: 'bsc',

    // При рандомных сетях будет браться нативный токен сети
    tokenToWithdraw: 'BNB',

    // При указании данного поля сеть для вывода будет выбрана рандомно из списка
    // Работает только, если useUsd = true
    randomBinanceWithdrawNetworks: [],

    // Сумма в диапазоне ОТ и ДО, которая будет выведена с Binance в токене, который указан в tokenToWithdraw
    minAndMaxAmount: [0.009, 0.0095],

    // Если баланс токена в tokenToWithdraw будет ниже этого значения, только тогда будет авто-пополнение
    minTokenBalance: 0.0003,

    // Модуль будет выполнен, только, если высчитанный amount вместе с fee будет больше указанного значение
    minAmount: 0,

    // Ожидаемый баланс на кошельке, который должен быть после выполнения модуля. При указании данного параметра, minAndMaxAmount и minNativeBalance не учитываются
    expectedBalance: [0, 0],

    // Использовать ли USD как значения балансов, amount
    useUsd: false,
  },
  'okx-withdraw': {
    count: [1, 1],
    indexGroup: 0,

    // Сеть из которой нужно делать вывод с OKX. eth | optimism | polygon | zkSync
    okxWithdrawNetwork: 'zkSync',
    // При указании данного поля сеть для вывода будет выбрана рандомно из списка
    // Работает только, если useUsd = true
    // randomOkxWithdrawNetworks: ['optimism', 'polygon', 'arbitrum'],

    // При рандомных сетях будет браться нативный токен сети
    tokenToWithdraw: 'ETH',

    // Сумма в диапазоне ОТ и ДО, которая будет выведена с OKX в токене, который указан в tokenToWithdraw
    minAndMaxAmount: [0, 0],

    // Если баланс токена в tokenToWithdraw будет ниже этого значения, только тогда будет авто-пополнение
    minTokenBalance: 1,

    // Модуль будет выполнен, только, если высчитанный amount вместе с fee будет больше указанного значение
    minAmount: 0,

    // Ожидаемый баланс на кошельке, который должен быть после выполнения модуля. При указании данного параметра, minAndMaxAmount и minNativeBalance не учитываются
    expectedBalance: [0, 0],

    // Использовать ли USD как значения балансов, amount
    useUsd: false,
  },
  // ============== Bridges ==============
  'routernitro-bridge': {
    count: [1, 1],
    indexGroup: 0,

    // eth
    contractAddress: 'native',

    // Сеть с которой будет выполнен бридж
    network: 'optimism',

    // При указании данного поля сеть для бриджа будет выбрана та из списка, где будет баланс выше minTokenBalance
    // Работает только, если useUsd = true
    randomNetworks: ['optimism', 'polygon', 'arbitrum'],

    // Минимальный баланс в сети для того, чтоб быть выбранным через randomNetworks
    minTokenBalance: 0.01,

    // Использовать ли USD как значения балансов, amount
    useUsd: false,

    // Сеть в которую будет выполнен бридж
    destinationNetwork: 'zkSync',

    // Если баланс в сети destinationNetwork кошелька будет ниже этого значения, только тогда будет выполнен модуль
    // Если вам на балансе нужно всего например 0.005 ETH в сети Ethereum, тогда укажите здесь это количество,
    // чтобы мы ничего не делали с этим кошельком при повторном запуске!
    minDestTokenBalance: 0.01,

    // Количество нативного токена, которые будут использовано для бриджа
    minAndMaxAmount: [0.003, 0.0035],
    usePercentBalance: false,

    // Ожидаемый баланс в сети destinationNetwork без учета fee
    expectedBalance: [0.0125, 0.0127],

    // Бридж будет выполнен только, если высчитанный amount будет больше данного значения
    minAmount: 0.005,

    // Модуль будет ожидать, пока текущий fee, не станет меньше или равным указанному
    maxFee: 0.00001,

    slippage: 1,
  },
  'orbiter-bridge': {
    count: [1, 1],
    indexGroup: 1,

    // Сеть, из которой будут отправлены токены
    network: 'arbitrum',

    // Количество токенов, которые будут использованы для модуля. Можно указать в процентах, если usePercentBalance true
    minAndMaxAmount: [0.0017, 0.0017],
    usePercentBalance: false,

    // Сеть, в которую будут отправлены токены через мост
    destinationNetwork: 'zkSync',
  },
  // ============== Swaps ==============
  'izumi-swap': {
    count: [1, 1],
    delay: [0, 0],
    indexGroup: 0,

    slippage: 1,

    srcToken: 'ETH',
    // 'USDT' | 'USDC' | 'DAI' | 'WETH' | 'WBTC' | 'SIS' | 'MUTE' | 'BUSD' | 'rETH' | 'PEPE', destination token будет выбран рандомно из списка
    destTokens: ['USDC', 'USDT'],
    usePercentBalance: true,
    minAndMaxAmount: [70, 80],
    reverse: false,
  },
  'sync-swap': {
    count: [1, 1],
    delay: [0, 0],
    indexGroup: 0,

    slippage: 1,

    srcToken: 'ETH',
    // 'USDT' | 'USDC' | 'DAI' | 'WETH' | 'WBTC' | 'SIS' | 'MUTE' | 'BUSD' | 'rETH' | 'PEPE', destination token будет выбран рандомно из списка
    destTokens: ['USDC', 'USDT'],
    usePercentBalance: true,
    minAndMaxAmount: [60, 70],
    reverse: false,
  },
  '1inch-swap': {
    count: [1, 1],
    delay: [0, 0],
    indexGroup: 0,

    slippage: 1,

    srcToken: 'ETH',
    // 'USDT' | 'USDC' | 'DAI' | 'WETH' | 'WBTC' | 'SIS' | 'MUTE' | 'BUSD' | 'rETH' | 'PEPE', destination token будет выбран рандомно из списка
    destTokens: ['USDC', 'USDT'],
    usePercentBalance: true,
    minAndMaxAmount: [70, 80],
    reverse: false,
  },
  // ============== Polyhedra ==============
  'polyhedra-check-claim': {
    count: [1, 1],
    indexGroup: 0,

    // Сеть для которой выполнять модуль
    network: 'eth',
  },
  'polyhedra-claim': {
    count: [1, 1],
    indexGroup: 1,

    // Сеть для которой выполнять модуль
    network: 'eth',
  },
  'polyhedra-transfer-claim': {
    count: [1, 1],
    indexGroup: 2,

    minAndMaxAmount: [100, 100],
    usePercentBalance: true,

    // Сеть для которой выполнять модуль
    network: 'eth',
  },
};
