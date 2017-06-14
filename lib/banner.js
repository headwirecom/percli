var asciify = require('asciify')

module.exports = {
    banner: function() {
        asciify('peregrine cms', {font:'big'}, function(err, res){ console.log(res) });
    }
}
