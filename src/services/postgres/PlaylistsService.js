const { Pool } = require("pg");
const autoBind = require("auto-bind");
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
    autoBind(this);
  }

  async addPlaylist({ name, owner }) {
    const query = {
      text: "INSERT INTO playlists (name, owner) VALUES($1, $2) RETURNING id",
      values: [name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
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
  
}

module.exports = PlaylistsService;
