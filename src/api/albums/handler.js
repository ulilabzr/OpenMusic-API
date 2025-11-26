const autoBind = require("auto-bind");
const ClientError = require("../../exceptions/ClientError");
const { error } = require("../../validator/exports/schema");

class AlbumsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { name, year } = request.payload;
    const albumId = await this._service.addAlbum({ name, year });

    const response = h.response({
      status: "success",
      message: "Album berhasil ditambahkan",
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
      status: "success",
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
      status: "success",
      message: "Album berhasil diperbarui",
    });
    response.code(200);
    return response;
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    const response = h.response({
      status: "success",
      message: "Album berhasil dihapus",
    });
    return response;
  }

  async postAlbumCoverByIdHandler(request, h) {
    const { id } = request.params;
    const { data } = request.payload;
    this._validator.validateImageHeaders(data.hapi.headers);
    const cover = await this._service.uploadAlbumCover(id, data);
    const response = h.response({
      status: "success",
      message: "Cover album berhasil diunggah",
      data: { cover },
    });
    response.code(201);
    return response;
  }

  async postAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.addAlbumLikesById(albumId, userId);

    const response = h.response({
      status: "success",
      message: "Like album berhasil ditambahkan",
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._service.deleteAlbumLikesById(albumId, userId);

    const response = h.response({
      status: "success",
      message: "Like album berhasil dihapus",
    });
    response.code(200);
    return response;
  }

  async getAlbumLikeByIdHandler(request, h) {
    const { id: albumId } = request.params;
    const likes = await this._service.getAlbumLikesById(albumId);

    const response = h.response({
      status: "success",
      data: {
        likes: Number(likes),
      },
    });
    response.header("X-Data-Source", "cache");
    return response;
  }
}

module.exports = AlbumsHandler;
