const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const autoBind = require('auto-bind');
const NotFoundError = require('../../exceptions/NotFoundError');

class PlaylistSongsService {
  constructor(songsService) {
    this._pool = new Pool();
    this._songsService = songsService;
    autoBind(this);
  }

  async addSongToPlaylist(playlistId, songId) {
    const id = `playlistsong-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_songs (id, playlist_id, song_id) VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    return result.rows[0].id;
  }

  async getSongsFromPlaylist(playlistId) {
    // Ambil daftar song_id dari playlist_songs (hanya query tabel playlist_songs)
    const query = {
      text: 'SELECT song_id FROM playlist_songs WHERE playlist_id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);
    const songIds = result.rows.map((row) => row.song_id);

    // Jika tidak ada songs, return array kosong
    if (songIds.length === 0) {
      return [];
    }

    // Ambil detail songs menggunakan SongsService secara paralel
    const songPromises = songIds.map((songId) => this._songsService.getSongById(songId));
    const songsData = await Promise.all(songPromises);

    // Map ke format yang diinginkan
    const songs = songsData.map((song) => ({
      id: song.id,
      title: song.title,
      performer: song.performer,
    }));

    return songs;
  }

  async removeSongFromPlaylist(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Lagu tidak ditemukan di playlist');
    }

    return result.rows[0].id;
  }
}

module.exports = PlaylistSongsService;
