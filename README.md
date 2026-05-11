# Налаштування оточення:

1. Створити віртуальне оточення в папці з проектом:
 python -m venv .venv

2. Активувати віртуальне оточення:
для Windows:
.venv\Scripts\Activate

для Linux/macOS:
source .venv/bin/activate

3. Встановити залежності, необхідні для запуску коду 01_load_data.py:
pip install -r requirements.txt

4. Строка підключення до бази. в корні з проектом створити файл з назвою ".env" та вмістом:
MONGO_URI=mongodb+srv://<ЛОГІН>:<ПАРОЛЬ>@<ПОСИЛАННЯ НА КЛАСТЕР НА MONGO DB Atlas>
Наприклад: 
MONGO_URI=mongodb+srv://db_user:UserPassword@cluster0.e5swz8u.mongodb.net/?appName=Cluster0

5. Запустити файл 01_load_data.py та перевірити створення в зазначеному вище кластері бази даних spotify та колекції tracks_raw
Через web-сайт MONGO DB Atlas

6. В командной строці запустити команду: 
mongosh "ВАШ_URI" --file scripts/02_transform.js
, де ВАШ_URI - це значення після = з пункту 4 даної інструкції.
Наприклад, mongosh "mongodb+srv://db_user:UserPassword@cluster0.e5swz8u.mongodb.net/?appName=Cluster0" --file scripts/02_transform.js

7. Перевірити створення в зазначеному вище кластері в базі даних spotify колекції tracks
Через web-сайт MONGO DB Atlas

8. Запуск запитів з папки queries:
Приєднатися до кластеру через MongoDB Compass та виконувати запити до бази даних в mongosh з файлів у папці queries


# Схема даних:

Приклад документу в колекції tracks:
{
  _id: ObjectId('6a01d6d4e79729e711ef4602'),
  track_id: '5SuOikwiRyPMVoIQDJUgSV',
  album_name: 'Comedy',
  track_name: 'Comedy',
  popularity: 73,
  duration_ms: 230666,
  explicit: false,
  track_genre: 'acoustic',
  artists: [
    'Gen Hoshino'
  ],
  audio_features: {
    danceability: 0.676,
    energy: 0.461,
    loudness: -6.746,
    speechiness: 0.143,
    acousticness: 0.0322,
    instrumentalness: 0.00000101,
    liveness: 0.358,
    valence: 0.715,
    tempo: 87.917,
    key: 1,
    mode: 0,
    time_signature: 4
  },
  duration_sec: 230.7,
  popularity_tier: 'high'
}


# Відповіді на теоретичні питання:
## Частина 1 — Завантаження даних та проєктування схеми
1. Чому аудіо-характеристики винесені в окремий об’єкт audio_features, а не зберігаються плоско? Коли таке вкладення вигідне, а коли створює проблеми?

Аудіо-характеристики винесені в окремий об’єкт audio_features, бо всі вони відносяться до характеристик. Це зручно при додаванні нової характеристики без перезапису чи зміни основної схеми даних. Проблеми з вкладеністю можуть бути, коли деякі поля потрібно часто аналізувати окремо, що збільшує шлях звернення, наприклад, audio_features.energy замість просто energy.

2. Чому виконавці зберігаються як масив, а не як рядок? Які запити стають простішими?

Виконавці зберігаються масивом, бо їх може бути декілька. Можна простіше робити пошук треків по виконавцю.

3. Що таке $out і чим він відрізняється від $merge? Коли використовувати кожен?

$out - використовується для перезапису цільової колекції даними за пайплайна. 
$merge - дозволяє додавати чи оновлювати документи до/в цільовій колекції не знищуючі існуючі дані.


## Частина 2 — Запити до даних
1. Для чого використовується інструкція $unwind?

$unwind - перетвоворює масив в окремі записи. 

2. Чим $stdDevPop відрізняється від $stdDevSamp?

$stdDevPop - розраховує стандартне відхилення для всіх даних
$stdDevSamp - розраховує стандартне відхилення по вибірці і на основі результатів оцінюється вся сукупність.


## Частина 3 — Аналітика через Aggregation Pipeline
1. У запиті 1 ми фільтруємо виконавців, у яких менше 5 треків. Як зміниться результат, якщо знизити поріг до 1? А що станеться, якщо вибирати виконавців із більш ніж 50 треками? Поясніть результат.

Якщо знизити поріг до 1, то зросте кількість виконавців, серед якиї буде вестися відбір за кращого. В рейтинг ТОП-10 найращих можуть потрапити виконавці, у яких дуже мало пісень, а саме значення середнього рейтингу буде менш репрезентативним, бо буде рахуватися по малій кількості треків. Якщо збільшити поріг до 50 треків, то у рейтинг потраплять ті виконавці, які мають в наявності багато треків, онак виконавці-початківці не будуть ніяк оцінені. Якщо порівняти 2 дії по зниженню та збільшенню порогу відсіювання, то зростання порогу відсіювання може мати певний сенс в досліжненні, якщо потрібно оцінити саме "старих" артистів.

2. У запиті 3 ми фільтруємо жанри з менше ніж 100 треками. Чи зміниться результат, якщо знизити поріг до 50? Поясніть результат.

Теоретично зниження порогу мало б видати результат з більшою кількістю жанрів, однак саме в наших даних кількість треків на жанр 1000, тому це ні на що не вплине.


## Частина 4 — аналіз індексів
1. Що змінилося в плані виконання?

Змінився тип пошуку інформації з COLLSCAN на IXSCAN, перегляд всіх документів totalDocsExamined: 113999 змінилося на вибір тільки потрібних документів у кількості 354. В результаті час виконання запиту змінився з executionTimeMillis: 80 на executionTimeMillis: 2.


2. Як зрозуміти, що індекс використовується? Наведіть скріншот або значення полів із explain(), які це підтверджують.

Ознакою використання індексів є те, що використовується IXSCAN замість COLLSCAN.

План виконання без індексів:
{
  explainVersion: '1',
  queryPlanner: {
    namespace: 'spotify.tracks',
    parsedQuery: {
      '$and': [
        {
          track_genre: {
            '$eq': 'pop'
          }
        },
        {
          'audio_features.danceability': {
            '$gte': 0.7
          }
        }
      ]
    },
    indexFilterSet: false,
    queryHash: '0E1A4507',
    planCacheShapeHash: '0E1A4507',
    planCacheKey: 'F6F4E2CB',
    optimizationTimeMillis: 0,
    maxIndexedOrSolutionsReached: false,
    maxIndexedAndSolutionsReached: false,
    maxScansToExplodeReached: false,
    prunedSimilarIndexes: false,
    winningPlan: {
      isCached: false,
      stage: 'SORT',
      sortPattern: {
        popularity: -1
      },
      memLimit: 33554432,
      type: 'simple',
      inputStage: {
        stage: 'COLLSCAN',
        filter: {
          '$and': [
            {
              track_genre: {
                '$eq': 'pop'
              }
            },
            {
              'audio_features.danceability': {
                '$gte': 0.7
              }
            }
          ]
        },
        direction: 'forward'
      }
    },
    rejectedPlans: []
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 354,
    executionTimeMillis: 80,
    totalKeysExamined: 0,
    totalDocsExamined: 113999,
    executionStages: {
      isCached: false,
      stage: 'SORT',
      nReturned: 354,
      executionTimeMillisEstimate: 74,
      works: 114355,
      advanced: 354,
      needTime: 114000,
      needYield: 0,
      saveState: 4,
      restoreState: 4,
      isEOF: 1,
      sortPattern: {
        popularity: -1
      },
      memLimit: 33554432,
      type: 'simple',
      totalDataSizeSorted: 197854,
      usedDisk: false,
      spills: 0,
      spilledDataStorageSize: 0,
      inputStage: {
        stage: 'COLLSCAN',
        filter: {
          '$and': [
            {
              track_genre: {
                '$eq': 'pop'
              }
            },
            {
              'audio_features.danceability': {
                '$gte': 0.7
              }
            }
          ]
        },
        nReturned: 354,
        executionTimeMillisEstimate: 70,
        works: 114000,
        advanced: 354,
        needTime: 113645,
        needYield: 0,
        saveState: 4,
        restoreState: 4,
        isEOF: 1,
        direction: 'forward',
        docsExamined: 113999
      }
    }
  },
  queryShapeHash: 'BA58BDC11203C5797E537CB74325D9F5FD7D14D9FAFACB8F094FFC013C01132D',
  command: {
    find: 'tracks',
    filter: {
      track_genre: 'pop',
      'audio_features.danceability': {
        '$gte': 0.7
      }
    },
    sort: {
      popularity: -1
    },
    '$db': 'spotify'
  },
  serverInfo: {
    host: 'ac-r89vxyq-shard-00-02.e5swz8u.mongodb.net',
    port: 27017,
    version: '8.0.23',
    gitVersion: 'ccf0d81588377542f00eeecf1b1ffbc095b1eeff'
  },
  serverParameters: {
    internalQueryFacetBufferSizeBytes: 104857600,
    internalQueryFacetMaxOutputDocSizeBytes: 104857600,
    internalLookupStageIntermediateDocumentMaxSizeBytes: 16793600,
    internalDocumentSourceGroupMaxMemoryBytes: 104857600,
    internalQueryMaxBlockingSortMemoryUsageBytes: 33554432,
    internalQueryProhibitBlockingMergeOnMongoS: 0,
    internalQueryMaxAddToSetBytes: 104857600,
    internalDocumentSourceSetWindowFieldsMaxMemoryBytes: 104857600,
    internalQueryFrameworkControl: 'trySbeRestricted',
    internalQueryPlannerIgnoreIndexWithCollationForRegex: 1
  },
  ok: 1,
  '$clusterTime': {
    clusterTime: Timestamp({ t: 1778501433, i: 2 }),
    signature: {
      hash: Binary.createFromBase64('q3A9ef4nDydSt48xM1ZExRRr/XU=', 0),
      keyId: 7582637913523880000
    }
  },
  operationTime: Timestamp({ t: 1778501433, i: 2 })
}

План виконання з індексом:
{
  explainVersion: '1',
  queryPlanner: {
    namespace: 'spotify.tracks',
    parsedQuery: {
      '$and': [
        {
          track_genre: {
            '$eq': 'pop'
          }
        },
        {
          'audio_features.danceability': {
            '$gte': 0.7
          }
        }
      ]
    },
    indexFilterSet: false,
    queryHash: '0E1A4507',
    planCacheShapeHash: '0E1A4507',
    planCacheKey: 'D55B24A2',
    optimizationTimeMillis: 0,
    maxIndexedOrSolutionsReached: false,
    maxIndexedAndSolutionsReached: false,
    maxScansToExplodeReached: false,
    prunedSimilarIndexes: false,
    winningPlan: {
      isCached: false,
      stage: 'FETCH',
      inputStage: {
        stage: 'SORT',
        sortPattern: {
          popularity: -1
        },
        memLimit: 33554432,
        type: 'default',
        inputStage: {
          stage: 'IXSCAN',
          keyPattern: {
            track_genre: 1,
            'audio_features.danceability': 1,
            popularity: -1
          },
          indexName: 'track_genre_1_audio_features.danceability_1_popularity_-1',
          isMultiKey: false,
          multiKeyPaths: {
            track_genre: [],
            'audio_features.danceability': [],
            popularity: []
          },
          isUnique: false,
          isSparse: false,
          isPartial: false,
          indexVersion: 2,
          direction: 'forward',
          indexBounds: {
            track_genre: [
              '["pop", "pop"]'
            ],
            'audio_features.danceability': [
              '[0.7, inf.0]'
            ],
            popularity: [
              '[MaxKey, MinKey]'
            ]
          }
        }
      }
    },
    rejectedPlans: []
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 354,
    executionTimeMillis: 2,
    totalKeysExamined: 354,
    totalDocsExamined: 354,
    executionStages: {
      isCached: false,
      stage: 'FETCH',
      nReturned: 354,
      executionTimeMillisEstimate: 2,
      works: 710,
      advanced: 354,
      needTime: 355,
      needYield: 0,
      saveState: 0,
      restoreState: 0,
      isEOF: 1,
      docsExamined: 354,
      alreadyHasObj: 0,
      inputStage: {
        stage: 'SORT',
        nReturned: 354,
        executionTimeMillisEstimate: 2,
        works: 710,
        advanced: 354,
        needTime: 355,
        needYield: 0,
        saveState: 0,
        restoreState: 0,
        isEOF: 1,
        sortPattern: {
          popularity: -1
        },
        memLimit: 33554432,
        type: 'default',
        totalDataSizeSorted: 27966,
        usedDisk: false,
        spills: 0,
        spilledDataStorageSize: 0,
        inputStage: {
          stage: 'IXSCAN',
          nReturned: 354,
          executionTimeMillisEstimate: 2,
          works: 355,
          advanced: 354,
          needTime: 0,
          needYield: 0,
          saveState: 0,
          restoreState: 0,
          isEOF: 1,
          keyPattern: {
            track_genre: 1,
            'audio_features.danceability': 1,
            popularity: -1
          },
          indexName: 'track_genre_1_audio_features.danceability_1_popularity_-1',
          isMultiKey: false,
          multiKeyPaths: {
            track_genre: [],
            'audio_features.danceability': [],
            popularity: []
          },
          isUnique: false,
          isSparse: false,
          isPartial: false,
          indexVersion: 2,
          direction: 'forward',
          indexBounds: {
            track_genre: [
              '["pop", "pop"]'
            ],
            'audio_features.danceability': [
              '[0.7, inf.0]'
            ],
            popularity: [
              '[MaxKey, MinKey]'
            ]
          },
          keysExamined: 354,
          seeks: 1,
          dupsTested: 0,
          dupsDropped: 0
        }
      }
    }
  },
  queryShapeHash: 'BA58BDC11203C5797E537CB74325D9F5FD7D14D9FAFACB8F094FFC013C01132D',
  command: {
    find: 'tracks',
    filter: {
      track_genre: 'pop',
      'audio_features.danceability': {
        '$gte': 0.7
      }
    },
    sort: {
      popularity: -1
    },
    '$db': 'spotify'
  },
  serverInfo: {
    host: 'ac-r89vxyq-shard-00-02.e5swz8u.mongodb.net',
    port: 27017,
    version: '8.0.23',
    gitVersion: 'ccf0d81588377542f00eeecf1b1ffbc095b1eeff'
  },
  serverParameters: {
    internalQueryFacetBufferSizeBytes: 104857600,
    internalQueryFacetMaxOutputDocSizeBytes: 104857600,
    internalLookupStageIntermediateDocumentMaxSizeBytes: 16793600,
    internalDocumentSourceGroupMaxMemoryBytes: 104857600,
    internalQueryMaxBlockingSortMemoryUsageBytes: 33554432,
    internalQueryProhibitBlockingMergeOnMongoS: 0,
    internalQueryMaxAddToSetBytes: 104857600,
    internalDocumentSourceSetWindowFieldsMaxMemoryBytes: 104857600,
    internalQueryFrameworkControl: 'trySbeRestricted',
    internalQueryPlannerIgnoreIndexWithCollationForRegex: 1
  },
  ok: 1,
  '$clusterTime': {
    clusterTime: Timestamp({ t: 1778502146, i: 4 }),
    signature: {
      hash: Binary.createFromBase64('hnx3ijK76Jko9dQVvJB98yWh6XY=', 0),
      keyId: 7582637913523880000
    }
  },
  operationTime: Timestamp({ t: 1778502146, i: 4 })
}

# Відповідь на питання про covered query

В першому завданні частини 4 було створено індекс по полям track_genre, audio_features.danceability, popularity.
Якщо використовувати при відборі та виводі інформації тільки поля, які присутні в індексі, то покриваючий індекс спрацює і інформація буде братися лише з нього. В нашому випадку у запиті в завданні 3 частини 4 використовуються поля track_genre і popularity для фільтрації, однак виводитися будуть усі поля, в тому числі і ті, які відсутні у індексі, тому MongoDB буде звертатися до документа і індекс не буде покривним. 
