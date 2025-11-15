const autoBind = require('auto-bind');

class PlaylistActivitiesHandler {
  constructor(playlistsService, playlistActivitiesService) {
    this._playlistsService = playlistsService;
    this._playlistActivitiesService = playlistActivitiesService;
    autoBind(this);
  }

  async getPlaylistActivitiesHandler(request) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);

    const activities = await this._playlistActivitiesService.getPlaylistActivities(playlistId);

    return {
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    };
  }
}

module.exports = PlaylistActivitiesHandler;
