const ClientError = require('../../exceptions/ClientError');
const autoBind = require('auto-bind');

class PlaylistsHandler{
    constructor(service, validator) {
        this._service = service;
        this._validator = validator;
        autoBind(this);
    }

    async postPlaylistHandler(request, h) {
        this._validator.validatePlaylistPayload(request.payload);
        const { name } = request.payload;
        const { id: credentialId } = request.auth.credentials;
        const playlistId = await this._service.addPlaylist({ name, owner: credentialId });

        const response = h.response({
            status: 'success',
            message: 'Playlist berhasil ditambahkan',
            data: {
                playlistId,
            },
        });
        response.code(201);
        return response;
    }

    async getPlaylistsHandler(request) {
        const { id: credentialId } = request.auth.credentials;
        const playlists = await this._service.getPlaylistsByOwner(credentialId);
        return {
            status: 'success',
            data: {
                playlists,
            },
        };
    }

    async deletePlaylistByIdHandler(request) {
        const { id } = request.params;
        const { id: credentialId } = request.auth.credentials;
        await this._service.deletePlaylistById(id, credentialId);
        return {
            status: 'success',
            message: 'Playlist berhasil dihapus',
        };
    }

    async postSongToPlaylistHandler(request, h) {
        this._validator.validatePlaylistSongPayload(request.payload);
        const { songId } = request.payload;
        const { id: playlistId } = request.params;
        const { id: credentialId } = request.auth.credentials;
        await this._service.addSongToPlaylist(playlistId, songId, credentialId);

        const response = h.response({
            status: 'success',
            message: 'Lagu berhasil ditambahkan ke playlist',
        });
        response.code(201);
        return response;
    }

    async getSongsFromPlaylistHandler(request) {
        const { id: playlistId } = request.params;
        const { id: credentialId } = request.auth.credentials;
        const songs = await this._service.getSongsFromPlaylist(playlistId, credentialId);
        return {
            status: 'success',
            data: {
                songs,
            },
        };
    }

    async deleteSongFromPlaylistHandler(request) {
        this._validator.validatePlaylistSongPayload(request.payload);
        const { songId } = request.payload;
        const { id: playlistId } = request.params;
        const { id: credentialId } = request.auth.credentials;
        await this._service.deleteSongFromPlaylist(playlistId, songId, credentialId);
        return {
            status: 'success',
            message: 'Lagu berhasil dihapus dari playlist',
        };
    }
}

module.exports = PlaylistsHandler;