const { Pool } = require("pg");
const autoBind = require("auto-bind");
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class PlaylistSongService {
  constructor() {
    this._pool = new Pool();
    autoBind(this);
  }

  async addSongToPlaylist(playlistId, songId) {
    const query = {
      text: "INSERT INTO playlist_songs (playlist_id, song_id) VALUES($1, $2) RETURNING id",
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    return result.rows[0].id;
  }

  async getSongsFromPlaylist(playlistId) {
    const query = {
      text: `SELECT songs.id, songs.title, songs.performer 
                   FROM songs
                     JOIN playlist_songs ON songs.id = playlist_songs.song_id
                     WHERE playlist_songs.playlist_id = $1`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async removeSongFromPlaylist(playlistId, songId) {
    const query = {
      text: "DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id",
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    return result.rows[0].id;
  }
}

module.exports = PlaylistSongService;
