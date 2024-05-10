import { Settings } from '../../types';

const settings: Settings = {
  // Список маршрутов, которые запустятся один за другим
  routes: ['polyhedra'], // 'base'

  shuffle: {
    wallets: true, // Кошельки будут выполняться в рандом порядке? true - да, false - нет
    modules: true, // Модули будут выполняться в рандом порядке? true - да, false - нет
  },

  // Количество потоков или сколько кошельков будут одновременно выполнять транзакци
  // Либо количество кошельков
  threads: 1,
  // Количество попыток, после которых кошелёк перестанет выполнять модуль и перейдёт к следующему модулю/кошельку
  txAttempts: 3,

  delay: {
    // Данную задержку можно перебить другой задержкой, если указать её внутри модуля
    beforeTxReceipt: [15, 15], // Задержка перед получением статуса транзакции
    betweenTransactions: [1, 3], // Задержка между транзакциями
    betweenModules: [10, 15], // Задержка между модулями
    betweenWallets: [10, 40], // Задержка между кошельками
    betweenCheckGas: [60, 120], // Задержка между ожиданием газа
    betweenRetries: 30, // Задержка между неудачными транзакциями
    betweenRestarts: 0, // Задержка (в часах) между повторным запуском скрипта (укажите 0, чтоб не запускать повторно)
  },

  // Данное поле будет фильтровать кошельки по указанным ID
  // Возможные форматы фильтра:
  // ['5'] - на выходе будет только кошелек с ID 0005
  // ['>5'] - на выходе будут кошельки с ID 0005 и больше
  // ['<5'] - на выходе будут кошельки с ID 0005 и меньше
  // [['1', '100']] - на выходе будут кошельки с ID от 0001 до 0100
  // Данные форматы можно комбинировать
  // Например: ['3', ['10', '13'], '20', '>100']
  // возьмет кошельки с ID 0003, 0020, от 0010 до 0013 и все начиная с 0100 и больше
  // Оставьте [], чтоб не применять фильтрацию
  idFilter: [],

  filters: {
    useFilter: false,

    // Статус клейма из claim чекер файла
    // Оставьте null чтобы отключить
    // 'Already claimed' | 'Check error' | 'Not eligible' | 'Claimed but not sent' | 'Claimed and sent' | 'Not claimed yet' | 'Claim error' | 'Successfully claimed' | 'Transfer error' | 'Successfully transferred'
    status: 'Not claimed yet',
  },

  // Если значение true, первым делом при восстановлении будет выполняться кошельки, на которых есть модули, которые еще не выполнялись
  // После чего выполняться те кошельки, где все невыполненные модули являются зафейленными
  useRestartFromNotFinished: true,

  // Запускать ли рестарт автоматически в конце основного скрипта, если остались зафейленые модули
  useRestartInMain: false,

  // Сохранять ли зафейленные модули в saved-modules для рестарта
  useSavedModules: true,

  // Использовать ли прокси при выполнении скрипта
  useProxy: false,

  // Использовать ли более детальные проверки транзакций при выполнении модулей
  useDetailedChecks: false,

  // Модули, будут дожидаться выполнения,
  // пока газ в перечисленных сетях не станет ниже переданного значения
  // Для отключения передайте 0
  // Не работает для модулей, которым передан параметр maxGas в настройках модуля
  maxGas: {
    eth: 0,
    scroll: 0,
    arbitrum: 0,
    optimism: 0,
    polygon: 0,
    zkSync: 0,
  },

  // Данный параметр - это процент, который будет добавлен/убавлен текущему газу в транзакциях
  // Чтобы добавить 5%, укажите 5
  // Чтобы убавить 5%, укажите -5
  // Для отключения передайте 0
  // Не работает для модулей, которым передан параметр gweiRange в настройках модуля
  gasMultiplier: {
    eth: 0,
    scroll: 10,
    arbitrum: 0,
    optimism: 0,
    polygon: 0,
    zkSync: 0,
  },

  // Минимальный баланс, который необходим для выполнения свапов
  minTokenBalance: {
    ETH: 0.005,
    WETH: 0.005,
    rETH: 0.005,
    USDT: 1,
    USDC: 1,
    DAI: 1,
    BUSD: 1,
    WBTC: 0.000005,
    SIS: 0.5,
    MUTE: 0.5,
    PEPE: 50000,
    iZi: 0,
  },

  // Авто-пополнение с ОКХ при низком балансе
  autoGas: {
    Polygon: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      // Минимальный баланс, ниже которого будет вызван модуль пополнения
      minBalance: 0.5,

      // Сумма ОТ и ДО для пополнения кошелька с бирж
      // Если это OKX, то перед этим нужно добавить все свои кошельки в WhiteList на ОКХ - https://thorlab.io/
      // Если Binance, то просто добавьте свой IP в настройках API
      withdrawToAmount: [5, 7],

      // Ожидаемый баланс на кошельке, который должен быть после выполнения автогаза.
      // При указании данного параметра, withdrawToAmount не учитываются
      expectedBalance: [0, 0],

      // Время, через которое скрипт сделает проверку баланса MM кошелька, чтобы проверить актуальный баланс
      // Пока кошелёк не будет пополнен с CEX дальнейшие действия будут заблокированы
      // Если пополнение произошло неудачно, то кошелёк моментально заканчивает своё выполнение
      withdrawSleep: [60, 70],
    },
    ERC20: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.004,
      withdrawToAmount: [0.01, 0.011],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    BSC: {
      useAutoGas: true,
      cex: 'binance', // binance | okx

      minBalance: 0.00033,
      withdrawToAmount: [0.004, 0.0047],
      expectedBalance: [0, 0],
      withdrawSleep: [30, 40],
    },
    opBNB: {
      useAutoGas: false,
      cex: 'binance', // binance | okx

      minBalance: 0.0005,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [30, 40],
    },
    zkSync: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Arbitrum: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Avalanche: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Optimism: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Base: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Linea: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Fantom: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Core: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Celo: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
    Klayn: {
      useAutoGas: false,
      cex: 'okx', // binance | okx

      minBalance: 0.0003,
      withdrawToAmount: [0.01, 0.012],
      expectedBalance: [0, 0],
      withdrawSleep: [170, 190],
    },
  },

  // Количество неудачных попыток выполнения транзакции перед тем как будет взято новое рандомное proxy из proxies.csv
  // Установите 0, если не хотите чтоб бралось новое proxy
  txAttemptsToChangeProxy: 3,
};

export default settings;
