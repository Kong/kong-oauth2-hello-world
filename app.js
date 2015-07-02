var request    = require('request');
var url        = require('url');
var bodyParser = require('body-parser')
var express    = require("express");
var app        = express();

app.set('view engine', 'jade');
app.use(bodyParser());

/*
  This is the secret provision key that the plugin has generated
  after being added to the API
*/
var PROVISION_KEY = process.argv.slice(2)[0];
if (!PROVISION_KEY) {
  console.error("You need to specify a provision_key when starting the server: node app.js [PROVISION_KEY]")
  process.exit(1)
} else {
  console.log("Provision Key is: " + PROVISION_KEY)
}

/*
  URLs to Kong
*/
var KONG_ADMIN = "http://127.0.0.1:8001"
var KONG_API = "http://127.0.0.1:8000"

/*
  The API Public DNS, required later when making a request
  to authorize the OAuth 2.0 client application
*/
var API_PUBLIC_DNS = "test.com"

/* 
  The scopes that we support, with their extended
  description for a nicer frontend user experience
*/
var SCOPE_DESCRIPTIONS = {
  email: "Grant permissions to read your email address",
  address: "Grant permissions to read your address information",
  phone: "Grant permissions to read your mobile phone number"
}

/*
  Retrieves the OAuth 2.0 client application name from
  a given client_id - used for a nicer fronted experience
*/
function get_application_name(client_id, callback) {
  request({
    url: KONG_ADMIN + "/oauth2",
    qs: { client_id: client_id },
    method: "GET"
  }, function(error, response, body) {
    var application_name
    if (client_id && !error) {
      var json_response = JSON.parse(body)
      if (json_response.data.length == 1) {
        application_name = json_response.data[0].name  
      }
    }
    callback(application_name)
  });
}

/*
  The POST request to Kong that will actually try to
  authorize the OAuth 2.0 client application after the
  user submits the form
*/
function authorize(client_id, response_type, scope, callback) {
  request({
    url: KONG_API + "/oauth2/authorize",
    form: { 
      client_id: client_id, 
      response_type: response_type, 
      scope: scope, 
      provision_key: PROVISION_KEY,
      authenticated_userid: "userid123" // Hard-coding this value (it should be the logged-in user ID)
    },
    method: "POST",
    headers: { host: API_PUBLIC_DNS }
  }, function(error, response, body) {
    callback(JSON.parse(body).redirect_uri)
  });
}

/*
  The route that shows the authorization page
*/
app.get('/authorize', function(req, res) {
  var querystring = url.parse(req.url, true).query
  get_application_name(querystring.client_id, function(application_name) {
    if (application_name) {
      res.render('authorization', { 
        client_id: querystring.client_id,
        response_type: querystring.response_type,
        scope: querystring.scope,
        application_name: application_name,
        SCOPE_DESCRIPTIONS: SCOPE_DESCRIPTIONS 
      });
    } else {
      res.status(403).send("Invalid client_id")
    }
  });
});

/*
  The route that handles the form submit, that will
  authorize the client application and redirect the user
*/
app.post('/authorize', function(req, res) {
  authorize(req.body.client_id, req.body.response_type, req.body.scope, function(redirect_uri) {
    res.redirect(redirect_uri);
  });
});

app.listen(3000);

console.log("Running at Port 3000");