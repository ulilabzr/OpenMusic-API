const PlaylistSongsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'playlistSongs',
  version: '1.0.0',
  register: async (
    server,
    {
      playlistsService, playlistSongsService, activitiesService, validator,
    },
  ) => {
    const handler = new PlaylistSongsHandler(
      playlistsService,
      playlistSongsService,
      activitiesService,
      validator,
    );
    server.route(routes(handler));
  },
};
