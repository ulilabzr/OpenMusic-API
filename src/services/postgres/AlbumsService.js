const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const { mapDBToModelAlbum } = require("../../utils/index");
const NotFoundError = require("../../exceptions/NotFoundError");
const CollaborationsService = require('./CollaborationsService');
const ClientError = require("../../exceptions/ClientError");

class AlbumService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._collaborationService = new CollaborationsService();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: "INSERT INTO albums (id, name, year, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING id",
      values: [id, name, year, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }
    return result.rows[0].id;
  }

  async getAlbums() {
    const query = {
      text: "SELECT id, name, year FROM albums",
    };
    const result = await this._pool.query(query);
    return result.rows.map(mapDBToModelAlbum);
  }

  async getAlbumById(id) {
    const albumQuery = {
      text: "SELECT id, name, year FROM albums WHERE id = $1",
      values: [id],
    };
    const albumResult = await this._pool.query(albumQuery);
    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const album = albumResult.rows[0];

    const songsQuery = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    };
    const songsResult = await this._pool.query(songsQuery);

    album.songs = songsResult.rows;

    return album;
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: "UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id",
      values: [name, year, updatedAt, id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
    
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async uploadAlbumCover(id, data) {
    const query = {
      text: "UPDATE albums SET cover = $1 WHERE id = $2 RETURNING id",
      values: [data, id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
    return data;
  }

  async addAlbumLikesById(albumId, userId) {
    // Cek album ada
    const albumCheck = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumCheck);
    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    // Cek apakah user sudah like album ini
    const checkLike = {
      text: "SELECT id FROM user_album_likes WHERE album_id = $1 AND user_id = $2",
      values: [albumId, userId],
    };
    const likeResult = await this._pool.query(checkLike);
    if (likeResult.rows.length > 0) {
      throw new ClientError("Anda sudah menyukai album ini", 400);
    }

    // Insert like
    const id = `like-${nanoid(16)}`;
    const query = {
      text: "INSERT INTO user_album_likes (id, album_id, user_id) VALUES($1, $2, $3) RETURNING id",
      values: [id, albumId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new InvariantError("Like album gagal ditambahkan");
    }

    // Invalidate cache
    await this._cacheService.delete(`album:${albumId}:likes`).catch(() => {
      // Ignore cache error
    });

    return result.rows[0].id;
  }

  async deleteAlbumLikesById(albumId, userId) {
    const query = {
      text: "DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id",
      values: [albumId, userId],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Like album gagal dihapus. Id tidak ditemukan");
    }

    // Invalidate cache
    await this._cacheService.delete(`album:${albumId}:likes`).catch(() => {
      // Ignore cache error
    });

    return result.rows[0].id;
  }

  async getAlbumLikesById(albumId) {
    // Cek album ada
    const albumCheck = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumCheck);
    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const cacheKey = `album:${albumId}:likes`;

    // Coba ambil dari cache
    try {
      const cachedLikes = await this._cacheService.get(cacheKey);
      return { likes: Number(cachedLikes), fromCache: true };
    } catch (error) {
      // Cache miss, query dari database
      const query = {
        text: "SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1",
        values: [albumId],
      };
      const result = await this._pool.query(query);
      const likes = result.rows[0].count;

      // Simpan ke cache dengan TTL 30 menit (1800 detik)
      await this._cacheService.set(cacheKey, likes, 1800).catch(() => {
        // Ignore cache error
      });

      return { likes: Number(likes), fromCache: false };
    }
  }

  async verifyAlbumOwner(id, owner) {
    const query = {
      text: "SELECT owner FROM albums WHERE id = $1",
      values: [id],
    };
    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
    return result.rows[0].owner;
  }

  async verifyAlbumAccess(id, owner) {
    try {
      const albumOwner = await this.verifyAlbumOwner(id);
      if (albumOwner !== owner) {
        throw new InvariantError("Anda tidak berhak mengakses resource ini");
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InvariantError("Anda tidak berhak mengakses resource ini");
    }
  }

  
}

module.exports = AlbumService;
