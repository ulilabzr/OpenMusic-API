const autoBind = require('auto-bind');

class PlaylistSongsHandler {
  constructor(
    playlistsService,
    playlistSongsService,
    activitiesService,
    songsService,
    validator,
  ) {
    this._playlistsService = playlistsService;
    this._playlistSongsService = playlistSongsService;
    this._activitiesService = activitiesService;
    this._songsService = songsService;
    this._validator = validator;
    autoBind(this);
  }

  async postPlaylistSongHandler(request, h) {
    // validasi payload
    this._validator.validatePlaylistSongPayload(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // cek akses playlist
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    // cek song ada - gunakan songsService yang sudah di-inject (bukan private property)
    await this._songsService.verifySongExists(songId);

    // insert ke playlist_songs
    await this._playlistSongsService.addSongToPlaylist(playlistId, songId);

    // catat aktivitas
    await this._activitiesService.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      'add',
    );

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsHandler(request) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    // cek akses playlist
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    // ambil detail playlist (termasuk name dan username)
    const playlist = await this._playlistsService.getPlaylistDetails(playlistId);

    // ambil lagu dari playlist (service khusus)
    const songs = await this._playlistSongsService.getSongsFromPlaylist(
      playlistId,
    );

    return {
      status: 'success',
      data: {
        playlist: {
          id: playlist.id,
          name: playlist.name,
          username: playlist.username,
          songs,
        },
      },
    };
  }

  async deletePlaylistSongHandler(request, h) {
    // validasi payload
    this._validator.validatePlaylistSongPayload(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // cek akses playlist
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    // cek lagu ada - gunakan songsService yang sudah di-inject
    await this._songsService.verifySongExists(songId);

    // hapus lagu dari playlist
    await this._playlistSongsService.removeSongFromPlaylist(playlistId, songId);

    // catat aktivitas
    await this._activitiesService.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      'delete',
    );

    return h.response({
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist',
    });
  }
}

module.exports = PlaylistSongsHandler;
