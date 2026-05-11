// scripts/02_transform.js
// Запуск: mongosh "ВАШ_URI" --file scripts/02_transform.js

// Використовуємо базу spotify
const spotify = db.getSiblingDB("spotify");

// 1. Видаляємо стару колекцію tracks, якщо існує
spotify.tracks.drop();

// 2–6. Трансформація даних з сирої колекції
spotify.tracks_raw.aggregate([
  {
    // 2. Проєкція полів
    $project: {
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: "$artists",
      _id: 0,

      // Аудіо-характеристики (потім видимо)
      danceability: 1,
      energy: 1,
      loudness: 1,
      speechiness: 1,
      acousticness: 1,
      instrumentalness: 1,
      liveness: 1,
      valence: 1,
      tempo: 1,
      key: 1,
      mode: 1,
      time_signature: 1,
    },
  },
  // 3. Перетворення артистів у масив
  {
    $addFields: {
      artists: {
        $map: {
          input: { $split: ["$artists_raw", ";"] },
          as: "artist",
          in: { $trim: { input: "$$artist" } },
        },
      },
    },
  },
  // 4. Формування аудіо-характеристик та обчислюваних полів
  {
    $addFields: {
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature",
      },
      duration_sec: {
        $round: [{ $divide: ["$duration_ms", 1000] }, 1],
      },
      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            {
              case: {
                $and: [
                  { $gte: ["$popularity", 40] },
                  { $lt: ["$popularity", 70] },
                ],
              },
              then: "medium",
            },
          ],
          default: "low",
        },
      },
    },
  },
  // 5. Очищення зайвих полів
  {
    $unset: [
      "danceability",
      "energy",
      "loudness",
      "speechiness",
      "acousticness",
      "instrumentalness",
      "liveness",
      "valence",
      "tempo",
      "key",
      "mode",
      "time_signature",
      "artists_raw",
    ],
  },
  //   6. Збереження результату
  { $out: "tracks" },
]);

// 7. Перевірка результату
print("Документів у tracks:", spotify.tracks.countDocuments());
printjson(spotify.tracks.findOne());
