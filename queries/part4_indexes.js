// Завдання 1. Аналіз запиту та індексація

// Оригінальний запит:
db.tracks
  .find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 },
  })
  .sort({ popularity: -1 })
  .toArray();

// Аналіз плану виконання без індексів:
db.tracks
  .find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 },
  })
  .sort({ popularity: -1 })
  .explain("executionStats");

// Створення індексу:
db.tracks.createIndex({
  track_genre: 1,
  "audio_features.danceability": 1,
  popularity: -1,
});

// Аналіз плану виконання після створення індексу
db.tracks
  .find({
    track_genre: "pop",
    "audio_features.danceability": { $gte: 0.7 },
  })
  .sort({ popularity: -1 })
  .explain("executionStats");

// Завдання 2. Індекс для інших полів

// Створення складеного індексу
db.tracks.createIndex({
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1,
  explicit: 1,
});

// Перевірка використання індексу
db.tracks
  .find({
    "audio_features.instrumentalness": { $gt: 0.5 },
    "audio_features.speechiness": { $lt: 0.1 },
    explicit: false,
  })
  .explain("executionStats");

//   Без індексу                        З індексом
// stage: 'COLLSCAN             --> stage: 'IXSCAN'
// totalDocsExamined: 113999    --> totalDocsExamined: 16141
// executionTimeMillis: 266     --> executionTimeMillis: 38