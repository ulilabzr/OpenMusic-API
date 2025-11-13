const Joi = require('joi');

const PlaylistPayloadSchema = Joi.object({
  name: Joi.string().required(),
  songs: Joi.array().items(Joi.string()),
});

module.exports = { PlaylistPayloadSchema };