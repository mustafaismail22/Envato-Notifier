window.EnvatoNotifier = window.EnvatoNotifier || {};

(function( window, document, $ ){

  "use strict";

  EnvatoNotifier.api = (function () {
	    console.log("API");

        var ClientId = "envato-notifier-7lqxcc9m";
        var ClientToken = "ycrlJW4QKwuDSsTWNwlzDl1zl26MsmBk";
        var ApiUrl = "https://api.envato.com/v1/";
	    var ApiToken = EnvatoNotifier.auth().getAuth().access_token;

        function _apiGet(endpoint, data, callback) {
            return $.when( _isExpired() ).pipe(function(){
                return $.ajax({
                    type: "GET",
                    url: ApiUrl + endpoint,
                    beforeSend: function (request) {
                        request.setRequestHeader("Authorization", "bearer " + ApiToken );
                    },
                    data: data,
                    success: function (result) {
                        console.log(result);
                        if (result.status == 'error') {
                            console.warn('API error: ');
                            console.warn(result);
                        }
                        if (typeof callback == 'function') {
                            callback(result);
                        }
                    },
                    error: function (result) {
                        console.warn('API js error');
                        console.warn(result);

                        // if ( result.responseJSON.error == "forbidden") {
                        //     EnvatoNotifier.auth().deleteAuth();
                        // }

                        if (typeof callback == 'function') {
                            callback(false);
                        }
                    },
                    dataType: 'json'
                });
            });
        }

        function _apiAuthorization(code , redirectUrl , refresh) {
            var AuthorizationUrl = "https://api.envato.com/token";

            var params = {
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUrl,
                    client_id: ClientId,
                    client_secret: ClientToken
                };

            if (refresh == true) {
                params = {
                    grant_type: 'refresh_token',
                    refresh_token: code ,
                    client_id: ClientId ,
                    client_secret: ClientToken
                };
            }

            console.log(params);

            return $.ajax({
                url: AuthorizationUrl,
                type: 'POST',
                dataType: 'json',
                data: params,
                success: function (result) {
                    // console.log(result);
                },
                error: function (result) {
                    if ( result.responseJSON.error_description) {
                        console.warn( result.responseJSON.error_description );
                    }
                }
            });
        }

        function _isExpired(){
            var dfd = $.Deferred();
            if (EnvatoNotifier.auth().isExpired()) {
                EnvatoNotifier.auth().refreshAuth().done(function(){
                    ApiToken = EnvatoNotifier.auth().getAuth().access_token;
                    dfd.resolve(true);
                }).fail(function() {
                    EnvatoNotifier.auth().deleteAuth();
                    dfd.reject(false);
                });
                return dfd.promise();
            }else{
                return true;
            }
        };

        return {
            get: _apiGet,
            authorization: _apiAuthorization
        }

    });


  EnvatoNotifier.auth = (function () {

        var redirectUrl = chrome.identity.getRedirectURL();
        var clientId = "envato-notifier-7lqxcc9m";
        var authUrl = "https://api.envato.com/authorization/?" +
            "client_id=" + clientId + "&" +
            "response_type=code&" +
            "redirect_uri=" + encodeURIComponent(redirectUrl);

        function _setAuth(){
          var dfd = $.Deferred();

            chrome.identity.launchWebAuthFlow({url: authUrl, interactive: true}, function(responseUrl) {
              
                var accessToken = responseUrl.substring(responseUrl.indexOf("=") + 1);
                
                EnvatoNotifier.api().authorization( accessToken , redirectUrl).always(function(result) { console.log(result);
                  
                  if (result.access_token) {

                    var time = new Date().getTime();
                    result.expires_in = time + ( result.expires_in * 1000);

                    localStorage['auth'] = JSON.stringify(result);

                    dfd.resolve(result);
                  } else if ( result.responseJSON.error_description) {
                    console.warn( result.responseJSON.error_description );
                    dfd.reject( result.responseJSON.error_description );
                  } else {
                    console.warn('Error fetching data.');
                    dfd.reject('Error fetching data.');
                  }

                });

            });
            
          return dfd.promise();
        }

        function _deleteAuth(){
          localStorage.clear();
        }

        function _getAuth(){
          if (!!localStorage["auth"]) {
            return JSON.parse(localStorage["auth"]);
          }
          return {};
        }

        function _refreshAuth(){
          var dfd = $.Deferred();
          var auth = _getAuth();

          if (auth.refresh_token) {

            EnvatoNotifier.api().authorization( auth.refresh_token , redirectUrl , true).always(function(result) { console.log(result);
              if (result.access_token) {

                var time = new Date().getTime();
                auth.expires_in = time + ( result.expires_in * 1000);
                auth.access_token = result.access_token;
                
                localStorage['auth'] = JSON.stringify(auth);
                dfd.resolve(auth);

              } else if ( result.responseJSON.error_description ) {
                console.warn( result.responseJSON.error_description );
                dfd.reject( result.responseJSON.error_description );
              } else {
                console.warn('Error fetching data.');
                dfd.reject('Error fetching data.');
              }
            });

          }else{
            console.warn('refresh_token is mandatory.');
            dfd.reject('refresh_token is mandatory.');
          }

          return dfd.promise();
        }

        function _isExpired(){
          return ( _getAuth().expires_in < new Date().getTime() );
        }

        function _isLoggedIn(){
          // return ( !!_getAuth().access_token && !_isExpired() );
          return ( !!_getAuth().access_token );
        }
        
        return {
          setAuth : _setAuth,
          refreshAuth : _refreshAuth,
          getAuth : _getAuth,
          deleteAuth : _deleteAuth,
          isLoggedIn : _isLoggedIn,
          isExpired: _isExpired
        }

    });

  return EnvatoNotifier;

})( window, document, $ );