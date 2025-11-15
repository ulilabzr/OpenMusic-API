const { Pool } = require('pg');
const autoBind = require('auto-bind');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class PlaylistActivitiesService {
  constructor() {
    this._pool = new Pool();
    autoBind(this);
  }

  async addPlaylistActivity(playlistId, songId, userId, action) {
    const query = {
      text: `INSERT INTO playlist_activities 
                   (playlist_id, song_id, user_id, action, time) 
                   VALUES($1, $2, $3, $4, $5) RETURNING id`,
      values: [playlistId, songId, userId, action, new Date().toISOString()],
    };
    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Aktivitas playlist gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async getPlaylistActivities(playlistId) {
    const query = {
      text: `SELECT users.username, songs.title, playlist_activities.action, playlist_activities.time 
                   FROM playlist_activities
                     JOIN users ON playlist_activities.user_id = users.id
                        JOIN songs ON playlist_activities.song_id = songs.id
                     WHERE playlist_activities.playlist_id = $1
                     ORDER BY playlist_activities.time ASC`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }
}

module.exports = PlaylistActivitiesService;
