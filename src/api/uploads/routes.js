const path = require('path');

module.exports = (handler) => [
  {
    method: 'POST',
    path: '/upload/images',
    handler: (request, h) => handler.postUploadImageHandler(request, h),
    options: {
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
        output: 'stream',
      },
    },
  }, {
    method: 'GET',
    path: '/upload/images/{filename}',
    handler: {
      directory: {
        path: path.resolve(__dirname, 'file/images'),
      },
    },
  },
];
