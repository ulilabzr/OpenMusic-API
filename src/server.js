require("dotenv").config();
const path = require("path");
const Jwt = require("@hapi/jwt");
const Hapi = require("@hapi/hapi");
const ClientError = require("./exceptions/ClientError");

// albums
const albums = require("./api/albums");
const AlbumsValidator = require("./validator/albums");
const AlbumsService = require("./services/postgres/AlbumsService");

// songs
const songs = require("./api/songs");
const SongsValidator = require("./validator/songs");
const SongsService = require("./services/postgres/SongsService");

// users
const users = require("./api/users");
const UsersValidator = require("./validator/users");
const UsersService = require("./services/postgres/UsersService");

// authentications
const TokenManager = require("./tokenize/TokenManager");
const authentications = require("./api/authentications");
const AuthenticationsValidator = require("./validator/authentications");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");

// playlists
const playlists = require("./api/playlists");
const PlaylistsValidator = require("./validator/playlists");
const PlaylistsService = require("./services/postgres/PlaylistsService");

// playlistActivities
const playlistActivities = require("./api/playlistActivities");
const PlaylistActivitiesService = require("./services/postgres/PlaylistActivitiesService");

// playlistSongs
const playlistSongs = require("./api/playlistSongs");
const PlaylistSongsService = require("./services/postgres/PlaylistSongsService");

// collaborations
const collaborations = require("./api/collaborations");
const CollaborationsValidator = require("./validator/collaborations");
const CollaborationsService = require("./services/postgres/CollaborationsService");

// exports
const _exports = require("./api/exports");
const ExportsValidator = require("./validator/exports");
const ProducerService = require("./services/rabbitmq/ProducerService");

// uploads
const uploads = require("./api/uploads");
const UploadsValidator = require("./validator/uploads");
const StorageService = require("./services/storage/StorageService");

// cache
const CacheService = require('./services/redis/CacheService');

const init = async () => {
  const songsService = new SongsService();
  const usersService = new UsersService();
  const cacheService = new CacheService();
  const albumsService = new AlbumsService();
  const playlistSongsService = new PlaylistSongsService();
  const collaborationsService = new CollaborationsService(cacheService);
  const playlistActivitiesService = new PlaylistActivitiesService();
  const playlistsService = new PlaylistsService(collaborationsService, cacheService);
  const authenticationsService = new AuthenticationsService();
  const storageService = new StorageService(
    path.resolve(__dirname, "api/uploads/file/images")
  );

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  await server.register([
    { plugin: Jwt },
    {
      plugin: Inert,
    },
  ]);

  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.userId,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        activitiesService: playlistActivitiesService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        validator: ExportsValidator,
      },
    },
    {
      plugin: playlistActivities,
      options: {
        playlistsService,
        playlistActivitiesService,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        validator: CollaborationsValidator,
      },
    },
    {
      plugin: playlistSongs,
      options: {
        playlistsService,
        playlistSongsService,
        activitiesService: playlistActivitiesService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: UploadsValidator,
      },
    },
  ]);

  console.log("--- Registered routes ---");
  server.table().forEach((route) => {
    console.log(`${route.method.toUpperCase()} ${route.path}`);
  });
  console.log("--- End routes ---");

  server.ext("onPreResponse", (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (!response.isServer) {
        return h.continue;
      }

      const newResponse = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      newResponse.code(500);
      console.error(response);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
