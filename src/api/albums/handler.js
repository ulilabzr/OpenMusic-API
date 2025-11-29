const autoBind = require('auto-bind');
const InvariantError = require('../../exceptions/InvariantError');

class AlbumsHandler {
  constructor(service, storageService, validator, uploadsValidator) {
    this._service = service;
    this._storageService = storageService;
    this._validator = validator;
    this._uploadsValidator = uploadsValidator; // Tambahkan ini

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const albumId = await this._service.addAlbum({ name, year });

    const response = h.response({
      status: 'success',
      message: 'Album berhasil ditambahkan',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    const response = h.response({
      status: 'success',
      data: {
        album,
      },
    });
    response.code(200);
    return response;
  }

  async putAlbumByIdHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;
    const { name, year } = request.payload;
    await this._service.editAlbumById(id, { name, year });

    const response = h.response({
      status: 'success',
      message: 'Album berhasil diperbarui',
    });
    response.code(200);
    return response;
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    const response = h.response({
      status: 'success',
      message: 'Album berhasil dihapus',
    });
    return response;
  }

  async postAlbumCoverByIdHandler(request, h) {
    const { id } = request.params;
    const { cover } = request.payload || {};

    if (!cover) {
      throw new InvariantError('File tidak ditemukan');
    }

    this._uploadsValidator.validateImageHeaders(cover.hapi.headers);
    const filename = await this._storageService.writeFile(cover, cover.hapi);
    const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/albums/${id}/cover/${filename}`;
    await this._service.updateAlbumCover(id, coverUrl);

    const response = h.response({
      status: 'success',
      message: 'Cover album berhasil diunggah',
      data: { cover: coverUrl },
    });
    response.code(201);
    return response;
  }

  async postAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.addAlbumLikesById(albumId, userId);

    const response = h.response({
      status: 'success',
      message: 'Like album berhasil ditambahkan',
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.deleteAlbumLikesById(albumId, userId);

    const response = h.response({
      status: 'success',
      message: 'Like album berhasil dihapus',
    });
    response.code(200);
    return response;
  }

  async getAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { likes, fromCache } = await this._service.getAlbumLikesById(albumId);

    const response = h.response({
      status: 'success',
      data: {
        likes,
      },
    });
    response.code(200);

    // Set header hanya jika data berasal dari cache
    if (fromCache) {
      response.header('X-Data-Source', 'cache');
    }

    return response;
  }
}

module.exports = AlbumsHandler;
