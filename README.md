# OAuth 2.0 Hello World for Kong

This is a simple node.js + express.js + jade application that demonstrates a simple implementation of the OAuth 2.0 authorization page required to make the [OAuth 2.0 plugin](http://getkong.org/plugins/oauth2-authentication) work on [Kong](getkong.org).

# Files

This project is made of two main files:

* `app.js`, which handles the server and contains two routes:
  * `GET /authorize`, that shows the authorization page to the end user
  * `POST /authorize`, that handles the form submit and triggers the authorization process on Kong
* `authorization.jade`, which is the authorization page that the user will see

# Installing dependencies

Execute

```shell
npm install
```

# Setting up the environment

To run this project, execute the following operations.

* Make sure you have Kong >= 0.10.3 running. We assume Kong is running at `127.0.0.1` with the default ports. One way to do it is using docker compose provided in `docker-compose.yml` and run the following

```shell
# needs to run sequentially due to migration
docker-compose up kong_db
docker-compose up kong_migration
docker-compose up kong
```

* Let's add a simple test API:

```shell
curl -d "name=cats" \
     -d "uris=/cats" \
     -d "upstream_url=http://mockbin.org/" \
     http://127.0.0.1:8001/apis/
```

* Let's add the OAuth 2.0 plugin, with three available scopes:

```shell
curl -d "name=oauth2" \
     -d "config.scopes=email, phone, address" \
     -d "config.mandatory_scope=true" \
     -d "config.enable_authorization_code=true" \
     http://127.0.0.1:8001/apis/cats/plugins/
```

This will output a response including an auto-generated `provision_key` that we need to use later:

```json
{
    "api_id": "2c0c8c84-cd7c-40b7-c0b8-41202e5ee50b",
    "value": {
        "scopes": [
            "email",
            "phone",
            "address"
        ],
        "mandatory_scope": true,
        "provision_key": "2ef290c575cc46eec61947aa9f1e67d3",
        "hide_credentials": false,
        "enable_authorization_code": true,
        "token_expiration": 7200
    },
    "created_at": 1435783325000,
    "enabled": true,
    "name": "oauth2",
    "id": "656954bd-2130-428f-c25c-8ec47227dafa"
}
```

The `provision_key` will be sent by the web application when communicating with Kong, to securely authenticate itself with Kong.

* Let's create a Kong consumer (called `thefosk`):

```shell
curl -d "username=thefosk" \
     http://127.0.0.1:8001/consumers/
```

* And the first OAuth 2.0 client application called `Hello World App`:

```shell
curl -d "name=Hello World App" \
     -d "redirect_uri=http://getkong.org/" \
     http://127.0.0.1:8001/consumers/thefosk/oauth2/
```

That outputs the following response, including the `client_id` and `client_secret` that we will use later:

```json
{
    "consumer_id": "a0977612-bd8c-4c6f-ccea-24743112847f",
    "client_id": "318f98be1453427bc2937fceab9811bd",
    "id": "7ce2f90c-3ec5-4d93-cd62-3d42eb6f9b64",
    "name": "Hello World App",
    "created_at": 1435783376000,
    "redirect_uri": "http://getkong.org/",
    "client_secret": "efbc9e1f2bcc4968c988ef5b839dd5a4"
}
```

# Running the web application

Now that Kong has all the data configured, we can start our application using the `provision_key` that has been returned when we added the plugin.

Export the environment variables used by the Node.js application:

```shell
export PROVISION_KEY="2ef290c575cc46eec61947aa9f1e67d3"
export KONG_ADMIN="http://127.0.0.1:8001"
export KONG_API="https://127.0.0.1:8443"
export API_PATH="/cats"
export SCOPES="{ \
  \"email\": \"Grant permissions to read your email address\", \
  \"address\": \"Grant permissions to read your address information\", \
  \"phone\": \"Grant permissions to read your mobile phone number\" \
}"
```

Note: By default, the application listens on port 3000. You can modify this if you like:

```shell
export LISTEN_PORT=3301
```

Then, start the authorization server:

```shell
node app.js
```


# Testing the Authorization Flow

To start the authorization flow we need to simulate the request that the client application will execute when redirecting the user to your API. This request will include the `response_type` parameter, the `client_id` and the `scope` requested.

*Note:* In our example we are skipping the log-in of the user, which is something you will do in production **before** showing the authorization page.

With your browser, go to `http://127.0.0.1:3000/authorize?response_type=code&scope=email%20address&client_id=318f98be1453427bc2937fceab9811bd` to show the authrorization page. You will see a page like:

![Authorization Prompt](http://i.imgur.com/JdY0H0K.png)

After clicking the "Authorize" button, you should be redirected to the `redirect_uri` we set up before with a `code` parameter in the querystring, like:

```
http://getkong.org/?code=ad286cf6694d40aac06eff2797b7208d
```

For testing purposes we set the `redirect_uri` to `http://getkong.org`, but in production this will be an URL that the client application will be able to read to parse the code and exchange it with an access token.

# Conclusions

Done! Now the client application has a `code` that it can use later on to request an `access_token`. From a provider perspective our job only consists in showing the authorization page and redirecting the user.

To retrieve an `access_token` you can now execute the following request:

```shell
curl https://127.0.0.1:8443/cats/oauth2/token \
     -H "Host: test.com" \
     -d "grant_type=authorization_code" \
     -d "client_id=318f98be1453427bc2937fceab9811bd" \
     -d "client_secret=efbc9e1f2bcc4968c988ef5b839dd5a4" \
     -d "redirect_uri=http://getkong.org/" \
     -d "code=ad286cf6694d40aac06eff2797b7208d" --insecure
```
