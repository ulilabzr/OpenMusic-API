const InvariantError = require('../../exceptions/InvariantError');
const { PlaylistPayloadSchema, PlaylistSongPayloadSchema } = require('./schema');

const PlaylistsValidator = {
  validatePlaylistPayload: (payload) => {
    const result = PlaylistPayloadSchema.validate(payload);
    if (result.error) {
      throw new InvariantError(result.error.message);
    }
  },

  validatePlaylistSongPayload: (payload) => {
    const result = PlaylistSongPayloadSchema.validate(payload);
    if (result.error) {
      throw new InvariantError(result.error.message);
    }
  },
};

module.exports = PlaylistsValidator;
