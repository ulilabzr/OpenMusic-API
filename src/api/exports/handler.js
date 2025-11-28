const autoBind = require("auto-bind");

class ExportsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    const { playlistId } = request.params;
    const { targetEmail } = request.payload;
    const { id: userId } = request.auth.credentials;

    const playlist = await this._playlistsService.getPlaylistById(playlistId);

    if (!playlist) {
      throw new NotFoundError("Playlist tidak ditemukan");
    }

    if (playlist.owner !== userId) {
      throw new AuthorizationError("Anda bukan pemilik playlist ini");
    }
    try {
      await this._service.sendMessage(
        "export:playlists",
        JSON.stringify({ playlistId, targetEmail })
      );
    } catch (err) {
      console.error("Failed to send export message", err);
      throw new Error("Gagal memproses permintaan ekspor");
    }
    const response = h.response({
      status: "success",
      message: "Permintaan Anda sedang kami proses",
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
