module.exports = (handler) => [
  {
    method: 'GET',
    path: '/playlists/{id}/activities',
    handler: (request, h) => handler.getPlaylistActivitiesHandler(request, h),
    options: {
      auth: 'openmusic_jwt',
    },
  },
];
