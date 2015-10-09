var fs = require('fs');
var uuid = require('uuid');
var yaml = require('js-yaml');
var nodeenv = require('nodeenv');
var expandHomeDir = require('expand-home-dir');

var FakeFS = require('fake-fs');

var common = require('./common');
var assert = common.assert;

var stormpathConfig = require('stormpath-config');
var configLoader = require('../lib/configLoader');

describe('Configuration loader', function () {
  var loader, fakeFs;

  // Sets up our fake file system with mock files.
  function setupFakeFs(files) {
    // If we already have a fake fs, then unpatch
    // the previous one and create a new.
    if(fakeFs) {
      fakeFs.unpatch();
    }

    fakeFs = new FakeFS().bind();

    var defaultConfigPath = process.cwd() + '/lib/config.yml';

    fakeFs.file(defaultConfigPath, {
      content: fs.readFileSync(process.cwd() + '/lib/config.yml')
    });

    if (files) {
      files.forEach(function (file) {
        fakeFs.file(file.path, { content: file.content });
      });
    }

    fakeFs.patch();
  }

  before(function () {
    loader = configLoader({
      skipRemoteConfig: true
    });
  });

  after(function () {
    if (fakeFs) {
      fakeFs.unpatch();
    }
  });

  it('should load without configuration', function(done) {
    setupFakeFs();

    loader.load(function (err, config) {
      if (err) {
        throw err;
      }

      assert(!!config);
      assert(config instanceof stormpathConfig.Config);

      done();
    });
  });

  it('should load the default configuration', function (done) {
    setupFakeFs();

    loader.load(function (err, config) {
      assert.isFalse(!!err);

      assert.isTrue(!!config);

      assert.isTrue(!!config.client);
      assert.isTrue(!!config.client.cacheManager);

      assert.isTrue(!!config.apiKey);

      assert.isTrue(!!config.client.apiKey);
      assert.isTrue('file' in config.client.apiKey);
      assert.isTrue('id' in config.client.apiKey);
      assert.isTrue('secret' in config.client.apiKey);

      assert.isTrue(!!config.client.proxy);
      assert.isNull(config.client.proxy.port);
      assert.isNull(config.client.proxy.host);
      assert.isNull(config.client.proxy.username);
      assert.isNull(config.client.proxy.password);

      assert.equal(config.client.baseUrl, "https://api.stormpath.com/v1");
      assert.equal(config.client.authenticationScheme, "SAUTHC1");
      assert.equal(config.client.connectionTimeout, 30);

      assert.isTrue(!!config.application);
      assert.isTrue('name' in config.application);
      assert.isTrue('href' in config.application);

      done();
    });
  });

  it('should load configuration from the environment', function (done) {
    setupFakeFs();

    var env = {
      STORMPATH_CLIENT_APIKEY_ID: uuid(),
      STORMPATH_CLIENT_APIKEY_SECRET: uuid(),
      STORMPATH_APPLICATION_HREF: 'http://api.stormpath.com/v1/applications/' + uuid(),
      STORMPATH_APPLICATION_NAME: uuid()
    };

    var restoreEnv;
    nodeenv(env, function (restore) {
      restoreEnv = restore;
    });

    after(function () {
      restoreEnv();
    });

    loader.load(function (err, config) {
      assert.isFalse(!!err);

      assert.isTrue(!!config);
      assert.isTrue(!!config.client);
      assert.isTrue(!!config.client.apiKey);
      assert.isTrue(!!config.application);

      assert.equal(config.client.apiKey.id, env.STORMPATH_CLIENT_APIKEY_ID);
      assert.equal(config.client.apiKey.secret, env.STORMPATH_CLIENT_APIKEY_SECRET);
      assert.equal(config.application.href, env.STORMPATH_APPLICATION_HREF);
      assert.equal(config.application.name, env.STORMPATH_APPLICATION_NAME);

      done();
    });
  });

  function testLoadStormpathConfig(ext, serializeFn) {
    describe('should load stormpath.' + ext + ' config', function () {
      it('from stormpath home folder', function (done) {
        var homeConfig = {
          client: {
            apiKey: {
              id: uuid(),
              secret: uuid()
            }
          }
        };

        setupFakeFs([{
          path: expandHomeDir('~/.stormpath/stormpath.' + ext),
          content: serializeFn(homeConfig)
        }]);

        loader.load(function (err, config) {
          assert.isNull(err);

          assert.isTrue(!!config);
          assert.isTrue(!!config.client);
          assert.isTrue(!!config.client.apiKey);

          assert.equal(config.client.apiKey.id, homeConfig.client.apiKey.id);
          assert.equal(config.client.apiKey.secret, homeConfig.client.apiKey.secret);

          done();
        });
      });

      it('from application directory while overriding home folder', function (done) {
        var homeConfig = {
          client: {
            apiKey: {
              id: uuid(),
              secret: uuid()
            }
          }
        };

        var appConfig = {
          client: {
            apiKey: {
              secret: uuid()
            }
          },
          application: {
            href: 'http://api.stormpath.com/v1/applications/' + uuid()
          }
        };

        setupFakeFs([{
          path: expandHomeDir('~/.stormpath/stormpath.' + ext),
          content: serializeFn(homeConfig)
        }, {
          path: process.cwd() + '/stormpath.' + ext,
          content: serializeFn(appConfig)
        }]);

        loader.load(function (err, config) {
          assert.isNull(err);

          assert.isTrue(!!config);
          assert.isTrue(!!config.client);
          assert.isTrue(!!config.application);
          assert.isTrue(!!config.client.apiKey);

          assert.equal(config.client.apiKey.id, homeConfig.client.apiKey.id);
          assert.equal(config.client.apiKey.secret, appConfig.client.apiKey.secret);
          assert.equal(config.application.href, appConfig.application.href);

          done();
        });
      });
    });
  }

  testLoadStormpathConfig('yml', yaml.dump);
  testLoadStormpathConfig('json', JSON.stringify);

  it('should extend config with custom config object', function (done) {
    setupFakeFs();

    var customConfig = {
      skipRemoteConfig: true,
      client: {
        apiKey: {
          id: uuid(),
          secret: uuid()
        }
      }
    };

    var loader = configLoader(customConfig);

    loader.load(function (err, config) {
      assert.isNull(err);

      assert.isTrue(!!config);
      assert.isTrue(!!config.client);
      assert.isTrue(!!config.client.apiKey);

      assert.equal(config.client.apiKey.id, customConfig.client.apiKey.id);
      assert.equal(config.client.apiKey.secret, customConfig.client.apiKey.secret);

      done();
    });
  });
});