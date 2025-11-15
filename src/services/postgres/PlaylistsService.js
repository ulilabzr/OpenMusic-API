const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const autoBind = require("auto-bind");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const AuthorizationError = require("../../exceptions/AuthorizationError");

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
    autoBind(this);
  }

  async addPlaylist({ name, owner }) {
    const id = nanoid(16);

    const query = {
      text: "INSERT INTO playlists VALUES($1, $2, $3) RETURNING id",
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Playlist gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getPlaylistsByOwner(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username
             FROM playlists
                JOIN users ON playlists.owner = users.id
                WHERE playlists.owner = $1`,
      values: [owner],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async verifyPlaylistAccess(playlistId, userId) {
    // cek dulu apakah playlist ada
    const queryPlaylist = {
      text: "SELECT id, owner FROM playlists WHERE id = $1",
      values: [playlistId],
    };

    const playlistResult = await this._pool.query(queryPlaylist);

    if (!playlistResult.rowCount) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = playlistResult.rows[0];

    // jika owner benar, akses ok
    if (playlist.owner === userId) return;

    // jika bukan owner, cek kolaborator
    const collabQuery = {
      text: `SELECT id FROM collaborations
           WHERE playlist_id = $1 AND user_id = $2`,
      values: [playlistId, userId],
    };

    const collabResult = await this._pool.query(collabQuery);

    if (!collabResult.rowCount) {
      throw new AuthorizationError("Anda tidak berhak mengakses playlist ini");
    }
  }

  async getPlaylistDetails(playlistId) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username
           FROM playlists
           JOIN users ON playlists.owner = users.id
           WHERE playlists.id = $1`,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    return result.rows[0];
  }

  async getSongsFromPlaylist(playlistId, userId) {
    await this.verifyPlaylistAccess(playlistId, userId);

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

  async addSongToPlaylist(playlistId, songId, userId) {
    await this.verifyPlaylistAccess(playlistId, userId);

    const query = {
      text: "INSERT INTO playlist_songs (playlist_id, song_id) VALUES($1, $2)",
      values: [playlistId, songId],
    };

    await this._pool.query(query);
  }

  async deleteSongFromPlaylist(playlistId, songId, userId) {
    await this.verifyPlaylistAccess(playlistId, userId);

    const query = {
      text: "DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2",
      values: [playlistId, songId],
    };

    await this._pool.query(query);
  }

  async verifyPlaylistOwner(playlistId, userId) {
    const query = {
      text: "SELECT owner FROM playlists WHERE id = $1",
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    const playlist = result.rows[0];

    if (playlist.owner !== userId) {
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini");
    }
  }

  async deletePlaylistById(playlistId, userId) {
    await this.verifyPlaylistOwner(playlistId, userId);

    const query = {
      text: "DELETE FROM playlists WHERE id = $1 RETURNING id",
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Playlist gagal dihapus. Id tidak ditemukan");
    }
  }

  async verifySongExists(songId) {
    const query = {
      text: "SELECT id FROM songs WHERE id = $1",
      values: [songId],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError("Lagu tidak ditemukan");
    }
  }
}

module.exports = PlaylistsService;
