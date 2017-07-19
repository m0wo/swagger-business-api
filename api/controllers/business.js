'use strict';
var GooglePlaces = require('googleplaces');
var googlePlaces = new GooglePlaces(process.env.GOOGLE_PLACES_API_KEY,
  process.env.GOOGLE_PLACES_OUTPUT_FORMAT);

module.exports = {
  lookup: stackMiddleware([limit, lookup])
};

function lookup(req, res, next) {
  var parameters = {
    query: req.body.name
  };

  googlePlaces.textSearch(parameters, function(error, response) {
    if(error) throw error;
    var promises = response.results.map(function(item) {
      return new Promise(function(resolve, reject) {
        var parameters = {
          placeid: item.place_id
        };

        googlePlaces.placeDetailsRequest(parameters, function(error, response) {
          if(error) {return reject(error)};
          var responseObj = {
            name: response.result.name,
            address: response.result.formatted_address,
            phone: {
              international: response.result.international_phone_number,
              formatted: response.result.formatted_phone_number
            }
          }
          resolve(responseObj);
        })

      })
    })

    Promise.all(promises)
    .then(function(result) {
      res.json({success: 1, data: result});
    })
    .catch(console.error);
  });
}

function limit(req, res, next) {
  //rate limiting code goes here.
  next();
}

//...it's best not to think about it.
//src: https://github.com/swagger-api/swagger-node/issues/278
function stackMiddleware(middleware) {
  return (req, res, next) => {
    let stack = [];
    for(var i = middleware.length; i--; i > 0) {
      const _middleware = middleware[i];
      if(i === 0) {
        _middleware(req, res, stack[stack.length - i - 1]);
      } else if (i === middleware.length - 1) {
        stack.push(
          () => { _middleware(req, res, next); }
        );
      }else {
        stack.push(
          () => { _middleware(req, res, stack[stack.length - i-1]); }
        )
      }
    }
  }
}
