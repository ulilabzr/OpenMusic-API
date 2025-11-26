const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(producerService, playlistsService, validator) {
    this._producerService = producerService;
    this._playlistsService = playlistsService;
    this._validator = validator;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload);
    const { playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;
    const { targetEmail } = request.payload;

    // Verifikasi pemilik playlist
    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);

    // Kirim pesan ke RabbitMQ dengan minimal data: playlistId dan targetEmail
    const message = JSON.stringify({
      playlistId,
      targetEmail,
    });
    await this._producerService.sendMessage('export:playlists', message);

    // Return response 201
    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda sedang kami proses',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;

