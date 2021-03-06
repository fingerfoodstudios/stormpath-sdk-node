'use strict';

var assert = require('assert');

var helpers = require('./helpers');

var AccessToken = require('../../lib/resource/AccessToken');
var RefreshToken = require('../../lib/resource/RefreshToken');
var Account = require('../../lib/resource/Account');
var CustomData = require('../../lib/resource/CustomData');

var AccountAccessTokenFixture = require('../fixtures/account-token');

describe('Account', function() {
  var fixture;

  before(function(done) {
    fixture = new AccountAccessTokenFixture();
    fixture.before(done);
  });

  after(function(done) {
    fixture.after(done);
  });

  it('should be create-able from a directory instance', function() {
    assert.equal(fixture.creationResult[0], null); // did not error
    assert(fixture.account instanceof Account);
  });

  it('should be retrievable by URI fragment', function(done) {
    var hrefParts = fixture.account.href.split('/');
    var uriFragment = '/' + hrefParts.slice(Math.max(hrefParts.length - 2, 1)).join('/');

    fixture.client.getAccount(uriFragment, function(err, _account) {
      if (err) {
        return done(err);
      }

      assert.equal(fixture.account.href, _account.href);
      done();
    });
  });

  describe('getAccessTokens',function(){
    it('should return a collection of access tokens',function(done){
      fixture.account.getAccessTokens(function(err,collection){
        if(err){
          done(err);
        }else{
          assert(collection.items[0] instanceof AccessToken);
          done();
        }
      });
    });
  });

  describe('getRefreshTokens',function(){
    it('should return a collection of refresh tokens',function(done){
      fixture.account.getRefreshTokens(function(err,collection){
        if(err){
          done(err);
        }else{
          assert(collection.items[0] instanceof RefreshToken);
          done();
        }
      });
    });
  });

  describe('customData', function() {
    describe('via getCustomData', function() {
      var customData;

      before(function(done) {
        fixture.account.getCustomData(function(err, _customData) {
          if (err) {
            return done(err);
          }

          customData = _customData;
          done();
        });
      });

      it('should be get-able', function() {
        assert(customData instanceof CustomData);
        assert.equal(customData.href, fixture.account.href + '/customData');
      });

      describe('when saved and re-fetched', function() {
        var customDataAfterGet;
        var propertyName;
        var propertyValue;

        before(function(done) {
          propertyName = helpers.uniqId();
          propertyValue = helpers.uniqId();

          customData[propertyName] = propertyValue;

          customData.save(function(err) {
            if (err) {
              return done(err);
            }

            fixture.account.getCustomData(function(err, customData) {
              if (err) {
                return done(err);
              }

              customDataAfterGet = customData;
              done();
            });
          });
        });

        it('should have the new property persisted', function() {
          assert.equal(customDataAfterGet[propertyName], propertyValue);
        });
      });
    });

    describe('via resource expansion', function() {
      function getExpandedAccount(cb) {
        fixture.client.getAccount(fixture.account.href, { expand: 'customData' }, function(err, account) {
          if (err) {
            throw err;
          }

          cb(account);
        });
      }

      var customData;

      before(function(done) {
        getExpandedAccount(function(account) {
          customData = account.customData;
          done();
        });
      });

      it('should be get-able', function() {
        assert(customData instanceof CustomData);
        assert.equal(customData.href, fixture.account.href + '/customData');
      });

      describe('when saved and re-fetched', function() {
        var customDataAfterGet;
        var propertyName;
        var propertyValue;

        before(function(done) {
          propertyName = helpers.uniqId();
          propertyValue = helpers.uniqId();

          customData[propertyName] = propertyValue;

          customData.save(function(err) {
            if (err) {
              return done(err);
            }

            getExpandedAccount(function(account) {
              customDataAfterGet = account.customData;
              done();
            });
          });
        });

        it('should have the new property persisted', function() {
          assert.equal(customDataAfterGet[propertyName], propertyValue);
        });
      });
    });
  });
});