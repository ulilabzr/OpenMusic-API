const autoBind = require("auto-bind");

class PlaylistSongsHandler {
  constructor(
    playlistsService,
    playlistSongsService,
    activitiesService,
    validator
  ) {
    this._playlistsService = playlistsService;
    this._playlistSongsService = playlistSongsService;
    this._activitiesService = activitiesService;
    this._validator = validator;
    autoBind(this);
  }

  async postPlaylistSongHandler(request, h) {
    // validasi payload
    this._validator.validatePlaylistSongPayload(request.payload);

    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // cek akses playlist (akan men-throw NotFoundError / AuthorizationError sesuai kasus)
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    // cek song ada (pakai PlaylistSongsService)
    await this._playlistSongsService.verifySongExists(songId);

    // insert ke playlist_songs
    await this._playlistSongsService.addSongToPlaylist(playlistId, songId);

    // catat aktivitas
    await this._activitiesService.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      "add"
    );

    const response = h.response({
      status: "success",
      message: "Lagu berhasil ditambahkan ke playlist",
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsHandler(request) {
    // GET tidak punya payload -> jangan validasi payload di sini
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    // cek akses playlist
    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    // ambil lagu dari playlist (service khusus)
    const songs = await this._playlistSongsService.getSongsFromPlaylist(
      playlistId
    );

    return {
      status: "success",
      data: {
        playlist: {
          id: playlistId,
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

    // cek lagu ada
    await this._playlistSongsService.verifySongExists(songId);

    // hapus lagu dari playlist (akan throw NotFoundError jika tidak ada)
    await this._playlistSongsService.removeSongFromPlaylist(playlistId, songId);

    // catat aktivitas
    await this._activitiesService.addPlaylistActivity(
      playlistId,
      songId,
      credentialId,
      "delete"
    );

    return h.response({
      status: "success",
      message: "Lagu berhasil dihapus dari playlist",
    });
  }
}

module.exports = PlaylistSongsHandler;
