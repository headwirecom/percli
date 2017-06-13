var https = require('https');
var fs = require('fs-extra');

var toFetch = []
var callback = null

module.exports = {

    onComplete: function(cb) {
        callback = cb
    },

    fetch: function(url, file) {
        fs.mkdirsSync('out')
        console.log('queue download', url, 'to', file)
        var file = fs.createWriteStream('out/'+file);
        toFetch.push(url)
        var request = https.get(url, function(response) {
            var stream = response.pipe(file);
            stream.on('finish', function() {
                console.log('download',url,'complete')
                toFetch.splice(toFetch.indexOf(url),1)
                if(toFetch.length === 0) {
                    callback()
                }
            })
        });
    }
}

