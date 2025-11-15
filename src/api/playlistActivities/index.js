const PlaylistActivitiesHandler = require('./handler');

module.exports = {
  name: 'playlistActivities',
  version: '1.0.0',
  register: async (server, { playlistsService, playlistActivitiesService }) => {
    const playlistActivitiesHandler = new PlaylistActivitiesHandler(
      playlistsService,
      playlistActivitiesService,
    );
    server.route(require('./routes')(playlistActivitiesHandler));
  },
};
