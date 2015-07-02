
var async = require('async');

module.exports = function(self, options) {

  self.createRoutes = function() {

    self.route('post', 'insert', self.routes.insert);
    self.route('post', 'retrieve', self.requirePiece, self.routes.retrieve);
    self.route('post', 'list', self.routes.list);
    self.route('post', 'update', self.requirePiece, self.routes.update);
    self.route('post', 'manage', self.requireEditor, self.routes.manage);
    self.route('post', 'editor', self.requireEditor, self.routes.editor);
    // TODO consider the following:
    // not using requirePiece for trash route because docs.trash already does
    // query to get the piece. it would be nice if you could pass a piece in
    // place of an id or criteria object so you can manipulate the object
    // earlier without performing additional queries

    // Another option here would be to hook into the docsBeforeTrash and
    // docsAfterTrash callAlls that take place in the trash method of docs
    self.route('post', 'trash', self.routes.trash);
    self.route('post', 'route', self.routes.rescue);
  };

  self.routes = {};

  self.routes.insert = function(req, res) {
    var piece = self.newInstance();

    return async.series({
      // hint: a partial object, or even passing no fields
      // at this point, is OK
      convert: function(callback) {
        return self.apos.schemas.convert(req, self.schema, 'form', req.body, piece, callback);
      },
      before: function(callback) {
        return self.beforeCreate(req, piece, callback);
      },
      insert: function(callback) {
        return self.insert(req, piece, callback);
      },
      after: function(callback) {
        return self.afterCreate(req, piece, callback);
      }
    }, function(err) {
      return self.insertResponse(req, res, err, piece);
    });
  };

  self.routes.retrieve = function(req, res) {
    return self.retrieveResponse(req, res, null, req.piece);
  };

  self.routes.list = function(req, res) {
    var results;
    var filters = req.body || {};
    return async.series({
      before: function(callback) {
        return self.beforeList(req, filters, callback);
      },
      list: function(callback) {
        return self.list(req, filters, function(err, _results) {
          if (err) {
            return callback(err);
          }
          results = _results;
          return callback(null);
        });
      },
      after: function(callback) {
        return self.afterList(req, results, callback);
      }
    }, function(err) {
      if ((!err) && (req.body.format === 'managePage')) {
        results.options = results.options || {};
        results.options.name = self.name;
        results = {
          list: self.render(req, 'managePage', results),
          pager: self.render(req, 'pager', results)
        };
      }
      return self.listResponse(req, res, err, results);
    });
  };

  self.routes.update = function(req, res) {
    var schema = self.schema;
    return async.series({
      convert: function(callback) {
        return self.apos.schemas.convert(req, self.schema, 'form', req.body, req.piece, callback);
      },
      before: function(callback) {
        return self.beforeUpdate(req, req.piece, callback);
      },
      update: function(callback) {
        return self.update(req, req.piece, callback);
      },
      after: function(callback) {
        return self.afterUpdate(req, req.piece, callback);
      },
    }, function(err) {
      return self.updateResponse(req, res, err, req.piece);
    });
  };

  self.routes.manage = function(req, res) {
    // We could be more selective about passing
    // self.options, but that would make this code
    // more brittle as new options are added in subclasses
    return res.send(self.render(req, 'manage', { options: self.options }));
  };

  self.routes.editor = function(req, res) {
    return res.send(self.render(req, 'editor', { options: self.options, schema: self.schema }));
  };

  self.routes.trash = function(req, res) {
    return async.series({
      before: function(callback) {
        return self.beforeTrash(req, req.body._id, callback);
      },
      trash: function(callback) {
        return self.trash(req, req.body._id, callback);
      },
      after: function(callback) {
        return self.afterTrash(req, req.body._id, callback)
      }
    }, function(err) {
      return self.trashResponse(req, res, err, {});
    });
  };

  self.routes.rescue = function(req, res) {
    return async.series({
      before: function(callback) {
        return self.beforeRescue(req, req.body._id, callback);
      },
      rescue: function(callback) {
        return self.rescue(req, req.body._id, callback);
      },
      after: function(callback) {
        return self.afterRescue(req, req.body._id, callback);
      }
    }, function(err) {
      return self.rescueResponse(req, res, err, {});
    });
  };
};