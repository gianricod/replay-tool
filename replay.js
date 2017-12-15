/*
 *
 * Author: Gianrico D'Angelis
 * email: gianrico.dangelis@gmail.com
 * version: 0.4
 */

/* <CONFIG SECTION> */
var conf = {
    hostname : "10.0.1.100",
    replHostname: "10.0.1.100",
    port: 81,
    filename: "data.har",
    baseDir: "data/",
    urlList: "/f5",
    replaceAddr: true,
    strictOrderUrls: []
}

/* </CONFIG SECTION> */


var url = require('url'),
    fs = require('fs'),
    http = require('http'),
    crypto = require('crypto');

var utils = {
    'contains': function(orig, substr) {
        return orig.indexOf(substr) !== -1;
    },
    'hasExclude': function(urlStr) {
        var i;
        for (i = 0; i < excludes.length; ++i) {
            if (this.contains(urlStr, excludes[i])) {
                return true;
            }
        }
        return false;
    },
    'hash': function(data, method, path) {
        var md5 = crypto.createHash('md5');
        md5.update((data + method + path), 'utf8'); // add command line flag for file format
        return md5.digest('hex');
    }
}

flushDir = function(dirPath) {
    try {
        var files = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            if (files[i] != "data.har") {
                var filePath = dirPath + '/' + files[i];
                if (fs.statSync(filePath).isFile())
                    fs.unlinkSync(filePath);
            }
        }
};


function parseCookies(request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function(cookie) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = unescape(parts.join('='));
    });

    return list;
}

var urlFile = '';

var scriptArgs = process.argv.slice(2),
    flag = scriptArgs[0];

var cacheDir = conf.baseDir + flag + '/';

flushDir(cacheDir);
console.log("Initializing cache dir " + cacheDir);

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function replaceAddr(text) {
    var tmpEntries, addrs = [];
    tmpEntries = (JSON.parse(text)).log.entries;
    for (i = 0; i < tmpEntries.length; i++) {
        var tmpEntry = tmpEntries[i].request.url;
        //console.log(tmpEntry);
        addrs.push(url.parse(tmpEntry).protocol + "//" + url.parse(tmpEntry).host);
    }

    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    addrs = addrs.filter(onlyUnique);
    var localHost = "http://" + conf.replHostname + ":" + conf.port;
    addrs.forEach(function(entry) {
        console.log("Replacing all occurrences of " + entry + " with " + localHost)
        var re = new RegExp(escapeRegExp(entry), 'g');
        text = text.replace(re, localHost);
    });
    return text;
}

function initialize(dir) {
    var fileData, entries;
    fileData = fs.readFileSync(cacheDir + conf.filename);
    if (conf.replaceAddr)
    	entries = (JSON.parse(replaceAddr(fileData.toString('utf-8')))).log.entries;
    else
	entries = (JSON.parse(fileData.toString('utf-8'))).log.entries;
    console.log("Found " + entries.length + " entries, processing ...");
    urlFile = '';
    for (i = 0; i < entries.length; i++) {
        var fileStore = {
            url: url.parse(entries[i].request.url).path.replace(/(\/)\/+/g, "$1"),
            //method	:entries[i].request.method,
            method: 'GET',
            code: !(entries[i].response.status == 200 || entries[i].response.status == 304) ? entries[i].response.status : 200,
            headers: (function() {
                var out = {};
                var hentries = entries[i].response.headers;
                for (j = 0; j < hentries.length; j++) {
                    var hname = hentries[j].name;
                    if (!hname.match(/Content-Encoding/i) && !hname.match(/Transfer-encoding/i) /*&& !hname.match(/Content-Length/i)*/)
                        out[hentries[j].name] = hentries[j].value;
                }
                return out;
            })(),
            data: entries[i].response.content.text,
            encoding: entries[i].response.content.encoding
        };
        //console.log("url: " + fileStore.url);
        fn = utils.hash(fileStore.method, fileStore.url); //body alwaysundefined for now
        if (fs.existsSync(cacheDir + fn)) {
            jArray = JSON.parse(fs.readFileSync(cacheDir + fn, 'utf8'));
            for (var ii = 0; ii <= (conf.strictOrderUrls.length - 1); ii++) {
                var re = new RegExp(conf.strictOrderUrls[ii], 'i');
                if (jArray[0].url.match(re)) {
                    (jArray[jArray.length - 1].headers)["Set-Cookie"] = fn + "=" + (jArray.length);
                }
            }
            jArray.push(fileStore);
            toWrite = JSON.stringify(jArray, null, 4);
            fs.writeFileSync(cacheDir + fn, toWrite);
            urlFile += '<a href="' + fileStore.url + '">' + fileStore.url + '</a><br/>';
        } else {
            toWrite = JSON.stringify(new Array(fileStore), null, 4);
            fs.writeFileSync(cacheDir + fn, toWrite);
            urlFile += '<a href="' + fileStore.url + '">' + fileStore.url + '</a><br/>';
        }
    }
    console.log("Done processing.");

}

initialize(cacheDir);


replayServer = http.createServer(function(req, res) {
    var _data;

    function respond(data, method, req_url) {
        console.log(req_url);
        body = '';
        var fn = utils.hash('GET', req_url.replace(/(\/)\/+/g, "$1"));
        var fileData,
        err = false;
 	/*if (req_url.endsWith("pdf")){
		console.log("******* REMOVE TE ************");
        	res.removeHeader('transfer-encoding');
	}*/
	if (req_url == conf.urlList) {
            res.write(urlFile);
            res.end()
        } else {
            var cookies = parseCookies(req);
            var idx = 0;
            if (!(typeof(cookies[fn]) == 'undefined')) {
                idx = cookies[fn];
            }
            try {
                fileData = JSON.parse(fs.readFileSync(cacheDir + fn, 'utf8'))[idx];
            } catch (errorThrown) {
                err = true;
            }
            if (err) {
                res.write('{}');
                res.end();
            } else {
                console.log(req_url + " -> " + fn);

                res.writeHead(fileData.code, fileData.headers);
                if (typeof(fileData.encoding) == 'undefined') {
                    body = (typeof(fileData.data) == 'undefined' ? '' : fileData.data);
                    res.write(body);
                    res.end();
                } else {
	            console.log("encoding "+fileData.encoding);
                    body = new Buffer(fileData.data, 'base64').toString('binary');
                    res.write(body, 'binary');
                    res.end();
                }
                //res.write(body);
                //res.end();

            }
        }
    };

    req.on('data', function(data) {
        _data = data.toString('utf8', 0, data.length);;
    });

    req.on('end', function() {
        respond(_data, req.method, req.url);
    });
});

replayServer.listen(conf.port, conf.hostname);
console.log("Replay server started\nPoint your browser at " + conf.urlList);
