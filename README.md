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

5. Завантажити датасет з даними та розмістити його в корні проекту:
Посилання на датасет Spotify Tracks Dataset: https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset

6. Запустити файл 01_load_data.py та перевірити створення в зазначеному вище кластері бази даних spotify та колекції tracks_raw
Через web-сайт MONGO DB Atlas

7. В командной строці запустити команду: 
mongosh "ВАШ_URI" --file scripts/02_transform.js
, де ВАШ_URI - це значення після = з пункту 4 даної інструкції.
Наприклад, mongosh "mongodb+srv://db_user:UserPassword@cluster0.e5swz8u.mongodb.net/?appName=Cluster0" --file scripts/02_transform.js

8. Перевірити створення в зазначеному вище кластері в базі даних spotify колекції tracks
Через web-сайт MONGO DB Atlas

9. Запуск запитів з папки queries:
Приєднатися до кластеру через MongoDB Compass та виконувати запити до бази даних в mongosh з файлів у папці queries


# Схема даних:

При перетворенні сирих даних з колекції tracks_raw на tracks деякі характеристики були об'єднані:
- артисти (artists) були перетворені на масив з окремих виконавців. Це дозволяє легко шукати треки за конкретним артистом через $in або $elemMatch. Якщо дані залишались би у вигляді рядка, то пошук можна було б робити через регулярні вирахи, що менш зручно.
- аудіо характеристики (audio_features) зібрані у вигляді вкладення, бо вони є логічною групою характеристик.

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

Аудіо-характеристики винесені в окремий об’єкт audio_features, бо всі вони відносяться до характеристик, які логічно можна об'єднати.

Переваги: Це зручно при додаванні нової характеристики без перезапису чи зміни основної схеми даних. Зручно у запитах звертатися до всіх характеристик через один шлях, або робити проекцію всього об'єкта. Менше можливих конфліктів у майбутноьому, бо, наприклад поле energy чи інше для аудіотреку може означати щось інше, у порівнянні з аудіо-характеристикою, де контекст більш чіткий і зрозумілий, що це саме аудіо-характеристика. 

Проблеми: Проблема індексації владених полів. Якщо часто потрібно комбінувати кілька характеристик у запитах (наприклад, danceability + energy + valence), доведеться створювати складені індекси. При агрегації робота з багатьма вкладеними полями стає більш громіздкою через довше посилання, наприклад, danceability у порівнянні з audio_features.danceability. Вкладеність характеристик може створювати ускладення при інтеграціях, якщо інші системи очікуватимуть плоску структуру даних (наприклад, експорт в csv файл), то доведеться робити додаткову трансформацію.

2. Чому виконавці зберігаються як масив, а не як рядок? Які запити стають простішими?

Виконавці зберігаються масивом, бо їх може бути декілька і це відповідає природній структурі даних. 
При такому збереженні даних 
- можна простіше робити пошук треків по виконавцю. Наприклад, пошук треків конкретного артиста можна робити подібним запитом: 
db.tracks.find({ artists: "Taylor Swift" }). Якби всі виконавсі зберігалися одним рядком, то пошук потрібно було б робити через регулярні вирази, що повільніше і менш надійно. 
- Також можливо через $unwind масив розбити на окремі документи і проводити підрахунки кількості треків для кожного артиста, проте $unwind збільшує кількість документів у пайплайні, що може впливати на продуктивність при великих колекціях. 
- Також можна швидко одержувати одержувати кількість артистів по треку як кількість значень масив. 
- Можна додавати індекс на дане поле, який стане multikey, це дозволить швидко знаходити треки за будь-яким артистом. За умови, якщо виконавців буде дуже багато, то індекс може розростатися, однак в нашому прикладі навряд чи кількість виконавців одного требу буде занадто великою. 
- При збереженні даних у вигляді масиву можна легко додавати або видаляти артиста без перетворення рядка. 

3. Що таке $out і чим він відрізняється від $merge? Коли використовувати кожен?

$out - використовується для перезапису цільової колекції даними з пайплайну. Зручно використовувати, коли ми будуємо нову "чисту" колекцію після трансформації даних. Це приклад класичного ETL, коли старі дані не потрібні, а нова колекція буде перезаписана.

$merge - дозволяє додавати чи оновлювати документи до/в цільовій колекції не знищуючі існуючі дані:
- може оновлювати документи (якщо збігається _id)
- може додавати нові документи
- може залишати старі документи без змін  
Використання $merge можна у продакшн-сценаріях, коли потрібно додавати нові документи або оновлювати існуючі. Це корисно, коли дані надходять потоково або пакетами і ми додаємо їх в колекцію. Наприклад, щодня додаються нові треки і ми додаємо їх в колекцію. Також є можливість налаштування поведінки, якщо співпадає ключ при додаванні даних: 
- вибрати чи потрібно замінювати документ повністю
- оновлювати лише поля з результату
- залишати старий документ без змін
- зупиняти виконання при конфлікті
- якщо документ відсутній, додавати новий документ
- якщо документ відсутній, пропускати

## Частина 2 — Запити до даних
1. Для чого використовується інструкція $unwind?

$unwind - перетвоворює масив в окремі записи, тобто буквально "розгортає" масив у кілька окремих документів - по одному на кожен елемент масиву. Даних механізм використовується при агрегаціях по елементах масиву, тобто можна рахувати кількість треків кожного артиста, навіть якщо вони були співавторами. Простіше проводити фільтрацію документів, де хоча б один елемент масиву має відповідати умові. Після розгортання можна групувати дані по кожному елементу масиву окремо. 
Є певні зауваженн щодо використання $unwind:
- збільшує кількість документів у пайплайні - якщо масив великий, це може суттєво впливати на продуктивність
- видалення документів, якщо масив порожній при використання параметру preserveNullAndEmptyArrays: true
- $unwind часто комбінується з $match, щоб відсіяти зайві елементи після розгортання

2. Чим $stdDevPop відрізняється від $stdDevSamp?

$stdDevPop - розраховує стандартне відхилення для всіх даних. Формула ділить на всі N елементів



$stdDevSamp - розраховує стандартне відхилення по вибірці і на основі результатів оцінюється вся сукупність. Формула ділить на N-1, щоб компенсувати те, що ми використовуємо лише частину даних і оцінюємо відхилення для всієї сукупності. $stdDevSamp завжди трохи більше $stdDevPop

Приклад використання:
db.tracks.aggregate([
  { $match: { track_genre: "acoustic" } },
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      std_pop: { $stdDevPop: "$audio_features.tempo" },
      std_samp: { $stdDevSamp: "$audio_features.tempo" }
    }
  }
]);


## Частина 3 — Аналітика через Aggregation Pipeline
1. У запиті 1 ми фільтруємо виконавців, у яких менше 5 треків. Як зміниться результат, якщо знизити поріг до 1? А що станеться, якщо вибирати виконавців із більш ніж 50 треками? Поясніть результат.

Якщо знизити поріг до 1, то:
- у вибірку потраплять усі виконавці, навіт ті, у кого лише один трек
- це призведен до того, що середня популярність для багатьої артистів буде фактично дорівнювати популярності одного треку
- результат буде "шумним", бо у ТОП можуть потрапити випадкові артисти з одним дуже популярним треком.
- результат буде менш репрезентативним і більш випадковим, а його інтерпретація може призводити до хибних висновків.

Якщо  підняти поріг до 50, то:
- у вибірку потраплять лише ті виконавці, у кого є велика кількість треків
- кількість кандидатів за ТОП-місце різко зменшиться, бо в датасеті багато артистів маю менше 50 треків
- середня популярність стане більш "стабільною", бо буде будуватися на великій кількості даних
- ми втратимо багато артистів із меншою дискографією, навіт якщо їхні треки були популярні
- результат буде репрезентативним, однак обмеженим лише артистами з великим каталогом треків

2. У запиті 3 ми фільтруємо жанри з менше ніж 100 треками. Чи зміниться результат, якщо знизити поріг до 50? Поясніть результат.

Теоретично зниження порогу з 100 до 50 треків на жанр мало б додати жанри з 50-99 треками, однак у вибірці усі жанри перевищують по кількості треків усі пороги. Тобто жанрів з менше, ніж 100 треків взагалі немає. Зважаючи на це, результат не зміниться, бо у вибірку потраплять ті самі жанри.


## Частина 4 — аналіз індексів
1. Що змінилося в плані виконання?

Змінився тип пошуку інформації з COLLSCAN на IXSCAN, перегляд всіх документів totalDocsExamined: 113999 змінилося на вибір тільки потрібних документів у кількості 354. В результаті час виконання запиту змінився з executionTimeMillis: 80 на executionTimeMillis: 2. 

Це видно по наступним показникам:
stage:	            COLLSCAN -->	IXSCAN
totalDocsExamined:	113,999	 -->	354
totalKeysExamined:	      0	 -->	354	
executionTimeMillis:	   80	 -->	2

2. Як зрозуміти, що індекс використовується? Наведіть скріншот або значення полів із explain(), які це підтверджують.

Ознакою використання індексів є те, що використовується IXSCAN замість COLLSCAN. 
У нашому випадку: stage: 'COLLSCAN' --> stage: 'IXSCAN'

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
Covered query — це запит, який може бути виконаний повністю за індексом, без звернення до самих документів. Щоб це сталося, мають виконуватися три умови:
- усі поля у фільтрі та сортуванні присутні в індексі
- усі поля у виводі (проєкції) також присутні в індексі
- у плані виконання немає стадії FETCH, тобто відсутність звернення до самого документу.
У нашому випадку у запиті із завдання 3 частини 4 використовуються поля track_genre і popularity, які є в індексі. Але у проекції за замовчування MongoDB повертає всі поля документу, включно з тими, що не входять до індексу. Це змушує MongoDB виконувати стадію FETCH, тому запит не є покривним. Якщо явно обмежити проекцію лише індексованими полями і виключити поле _id, то такий запит буде covered query:

db.tracks.find(
  { track_genre: "pop", popularity: { $gte: 70 } },
  { track_genre: 1, popularity: 1, _id: 0 }
);
