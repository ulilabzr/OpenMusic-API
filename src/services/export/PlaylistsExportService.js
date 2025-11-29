const autoBind = require('auto-bind');

class PlaylistsExportService {
  constructor(logger = console) {
    this._logger = logger;
    autoBind(this);
  }

  async enqueueExport({ userId, targetEmail }) {
    const message = `[PlaylistsExportService] queued export request for user ${userId} to ${targetEmail}`;
    if (typeof this._logger.info === 'function') {
      this._logger.info(message);
      return;
    }
    this._logger.log(message);
  }
}

module.exports = PlaylistsExportService;
