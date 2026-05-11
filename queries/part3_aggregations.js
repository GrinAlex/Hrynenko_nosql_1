// Завдання 1. Топ-10 виконавців за середньою популярністю
db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      avg_popularity: { $avg: "$popularity" },
    },
  },
  {
    $match: {
      track_count: { $gte: 5 },
    },
  },
  { $sort: { avg_popularity: -1 } },
  { $limit: 10 },
]);

// Завдання 2. Розподіл треків за настроєм
db.tracks.aggregate([
  {
    $project: {
      mood: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] },
                ],
              },
              then: "happy",
            },
            {
              case: {
                $and: [
                  { $lt: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] },
                ],
              },
              then: "angry",
            },
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $lt: ["$audio_features.energy", 0.5] },
                ],
              },
              then: "calm",
            },
            {
              case: {
                $and: [
                  { $lt: ["$audio_features.valence", 0.5] },
                  { $lt: ["$audio_features.energy", 0.5] },
                ],
              },
              then: "sad",
            },
          ],
          default: "undefined",
        },
      },
    },
  },
  {
    $group: {
      _id: "$mood",
      track_count: { $sum: 1 },
    },
  },
  {
    $project: {
      mood: "$_id",
      track_count: 1,
      _id: 0,
    },
  },
]);

// Завдання 3. Найбільш «танцювальний» жанр
db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" },
      track_count: { $sum: 1 },
    },
  },
  { $match: { track_count: { $lte: 100 } } },
  {
    $project: {
      track_genre: "$_id",
      avg_danceability: 1,
      avg_energy: 1,
      avg_valence: 1,
      track_count: 1,
      _id: 0,
    },
  },
  { $sort: { avg_danceability: -1 } },
]);
