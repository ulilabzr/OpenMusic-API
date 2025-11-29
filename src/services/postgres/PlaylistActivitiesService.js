const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const autoBind = require('auto-bind');
const InvariantError = require('../../exceptions/InvariantError');

class PlaylistActivitiesService {
  constructor(songsService, usersService) {
    this._pool = new Pool();
    this._songsService = songsService;
    this._usersService = usersService;
    autoBind(this);
  }

  async addPlaylistActivity(playlistId, songId, userId, action) {
    const id = `activity-${nanoid(16)}`;
    const query = {
      text: `INSERT INTO playlist_song_activities 
                   (id, playlist_id, song_id, user_id, action, time) 
                   VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
      values: [id, playlistId, songId, userId, action, new Date().toISOString()],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Aktivitas playlist gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async getPlaylistActivities(playlistId) {
    // Ambil activities dari tabel playlist_song_activities
    const query = {
      text: `SELECT song_id, user_id, action, time 
             FROM playlist_song_activities
             WHERE playlist_id = $1
             ORDER BY time ASC`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);

    if (result.rows.length === 0) {
      return [];
    }

    // Ambil unique song_ids dan user_ids
    const songIds = [...new Set(result.rows.map((row) => row.song_id))];
    const userIds = [...new Set(result.rows.map((row) => row.user_id))];

    // Ambil songs dan users secara paralel menggunakan service
    const [songs, users] = await Promise.all([
      this._songsService.getSongsByIds(songIds),
      this._usersService.getUsersByIds(userIds),
    ]);

    // Buat map untuk lookup cepat
    const songsMap = new Map(songs.map((song) => [song.id, song]));
    const usersMap = new Map(users.map((user) => [user.id, user]));

    // Map activities dengan data songs dan users
    return result.rows.map((activity) => ({
      username: usersMap.get(activity.user_id)?.username || 'Unknown',
      title: songsMap.get(activity.song_id)?.title || 'Unknown',
      action: activity.action,
      time: activity.time,
    }));
  }
}

module.exports = PlaylistActivitiesService;
