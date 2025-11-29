const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const autoBind = require('auto-bind');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  constructor(collaborationService, cacheService, songsService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
    this._songsService = songsService;
    autoBind(this);
  }

  async addPlaylist({ name, owner }) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows || !result.rows[0] || !result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    await this._cacheService.delete(`playlists:${owner}`);
    return result.rows[0].id;
  }

  async getPlaylistsByOwner(owner) {
    try {
      const result = await this._cacheService.get(`playlists:${owner}`);
      return JSON.parse(result);
    } catch (error) {
      const query = {
        text: `SELECT DISTINCT playlists.id, playlists.name, users.username
             FROM playlists
                JOIN users ON playlists.owner = users.id
                WHERE playlists.owner = $1
             UNION
             SELECT DISTINCT playlists.id, playlists.name, users.username
             FROM playlists
                JOIN users ON playlists.owner = users.id
                JOIN collaborations ON playlists.id = collaborations.playlist_id
                WHERE collaborations.user_id = $1`,
        values: [owner],
      };

      const result = await this._pool.query(query);
      const mappedResult = result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        username: r.username,
      }));
      await this._cacheService.set(
        `playlists:${owner}`,
        JSON.stringify(mappedResult),
      );

      return mappedResult;
    }
  }

  async getPlaylistById(playlistId) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username
            FROM playlists
            JOIN users ON playlists.owner = users.id
            WHERE playlists.id = $1`,
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      return null;
    }
    return result.rows[0];
  }

  async verifyPlaylistAccess(playlistId, userId) {
    // verify the playlist exists
    const query = {
      text: 'SELECT owner FROM playlists WHERE id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    // Check if user is the owner
    if (playlist.owner === userId) {
      return;
    }

    // Check if user is a collaborator
    if (!this._collaborationService || typeof this._collaborationService.verifyCollaborator !== 'function') {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }

    try {
      await this._collaborationService.verifyCollaborator(playlistId, userId);
    } catch (error) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
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
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return result.rows[0];
  }

  async verifyPlaylistOwner(playlistId, userId) {
    const query = {
      text: 'SELECT owner FROM playlists WHERE id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== userId) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async deletePlaylistById(playlistId, userId) {
    await this.verifyPlaylistOwner(playlistId, userId);

    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id, owner',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }

    const { owner } = result.rows[0];
    await this._cacheService.delete(`playlists:${owner}`);
  }
}

module.exports = PlaylistsService;
