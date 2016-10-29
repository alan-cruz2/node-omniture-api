'use strict'

var sha1 = require('sha1')
  , md5 = require('md5')
  , request = require('request')
  , util = require('util');

var apiUrls = {
  'sanJose': 'https://api.omniture.com/admin/1.4/rest/',
  'dallas': 'https://api2.omniture.com/admin/1.4/rest/',
  'london': 'https://api3.omniture.com/admin/1.4/rest/',
  'sanJoseBeta': 'https://beta-api.omniture.com/admin/1.4/rest/',
  'dallasBeta': 'https://beta-api2.omniture.com/admin/1.4/rest/',
  'sandbox': 'https://api-sbx1.omniture.com/admin/1.4/rest/'
};

function OmnitureAPI( options ) {
  Object.assign(this, options);
  this.apiUrl = apiUrls[this.environment || 'sanJose'];
}

OmnitureAPI.prototype.queueAndFetchReport = function(requestData,callback) {
  var scope = this;
  this.makeRequest('Report.Queue',requestData,function(error,response,data) {
    if (!error) {
      //Requires at least a small delay before making the subsequent request.
      setTimeout(function() {
        scope.fetchReport(data.reportID,function(err,res,data) {
          callback(err,res,data);
        });
      },500);
    } else {
      callback(error,response, data);
    }
  });
};

OmnitureAPI.prototype.fetchReport = function(reportId,callback) {
  var scope = this;
  this.makeRequest('Report.Get',{"reportID":reportId},function(error,response,data) {
    if ( data.error == 'report_not_ready' ) {
      setTimeout(function() {
        scope.fetchReport(reportId,callback);
      }, 2000);
    } else {
      callback(error,response,data);
    }
  });
};

OmnitureAPI.prototype.makeRequest = function(endpoint,data,callback) {
  //Create info used for header authentication.
  var date = new Date();
  var nonce = md5(Math.random());
  var nonce_ts = date.toISOString().replace(/(\.\d\d\dZ)/ ,'Z');;
  var digest = (new Buffer(sha1(nonce + nonce_ts + this.secret)).toString('base64'));

  var requestOptions = {
    url: this.apiUrl + '?method=' + endpoint,
    method: 'POST',
    //Headers required a bit of a hack. Special thanks to https://github.com/imartingraham/nomniture/blob/master/lib/client.js
    headers: {
      "X-WSSE": "UsernameToken Username=\""+this.userName+"\", " +
                  "PasswordDigest=\""+digest+"\", "+
                  "Nonce=\""+nonce+"\", "+
                  "Created=\""+nonce_ts+"\""
    },
    form:data,
    proxy: this.proxy
  };
  
  request(requestOptions, function(error,response,body) {
    callback(error, response, JSON.parse(body));
  });
};

module.exports = OmnitureAPI;
