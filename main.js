var request     = require('request');
var https       = require('https');
var fs          = require('fs');
var Q           = require('q');


var utils       = require('./utils.js');
var pre         = require('./pre-readme-content.js');
var post        = require('./post-readme-content.js');


// To prevent error: http://stackoverflow.com/questions/10888610/ignore-invalid-self-signed-ssl-certificate-in-node-js-with-https-request
// { [Error: self signed certificate in certificate chain] code: 'SELF_SIGNED_CERT_IN_CHAIN' }
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var config = {
    accessToken: process.env.PH_ACCESS_TOKEN || '',
    collectionId: 15467,
    filename: 'README.md'
};

var options = {
    hostname: 'api.producthunt.com',
    path: '/v1/collections/' + config.collectionId,
    method: 'GET',
    headers: {
        'Authorization': 'Bearer ' + config.accessToken
    }
};

var products = '';

function writeDataToFile() {
    var ReadmeContent = pre.readmeContent + products + post.readmeContent;
    fs.writeFile(config.filename, ReadmeContent, function (err) {
        if (err) { throw err; }
    });
}

function expandUrl(shortUrl) {
    var deferred = Q.defer();
    request({
        method: 'HEAD',
        url: shortUrl,
        followAllRedirects: true
    },function (error, response, body) {
        if (!error) {
            deferred.resolve(response);
        } else {
            console.log('Some error occurred', error)
            deferred.reject(new Error(error));
        }
    })
    return deferred.promise;
}

function getMakersString(makers) {
    var makersString = '';
    for (var i = 0; i < makers.length; i++) {
        if (i !== 0) {
            makersString += ', ';
        }
        makersString += '[' + makers[i].name + '](https://twitter.com/' + makers[i].twitter_username + ')';
    }
    return makersString;
}

function getActualUrlFromRedirectUrl(collectionPosts, index) {
    index = index || 0;

    var name = collectionPosts[index].name,
        tagline = collectionPosts[index].tagline,
        makers = getMakersString(collectionPosts[index].makers);

    expandUrl(collectionPosts[index].redirect_url).then(function(urlData) {
        var url = urlData.request.uri.hostname;

        if (url.indexOf('producthunt.com') > -1) { url = ''; }
        products += '\n\n\n' + (index + 1) + '. [' + name + '](' + url + ') \n\n  **Description** - ' + tagline;
        if (makers) {
            products += '\n\n  **Makers** - ' + makers;
        }

        ++index;
        if (index < collectionPosts.length) {
            getActualUrlFromRedirectUrl(collectionPosts, index);
        } else {
            writeDataToFile();
        }
    });
}

function getCollections() {
    var req = https.request(options, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            var response = JSON.parse(body);
            if (response.error) {
                console.log('Something went wrong.');
                return;
            }
            var collectionPosts = response.collection.posts;
            utils.sortOn(collectionPosts, 'votes_count', true);
            getActualUrlFromRedirectUrl(collectionPosts);
        });
    });

    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
}

getCollections();