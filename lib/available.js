/**
 * check if java is avilable and what version of java we find
 * 
 * @param {*} callback 
 */
function javaversion(callback) {
    var spawn = require('child_process').spawn('java', ['-version']);
    spawn.on('error', function(err){
        return callback(err, null);
    })
    spawn.stderr.on('data', function(data) {
        data = data.toString().split('\n')[0];
        var javaVersion = new RegExp('version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;
        if (javaVersion != false) {
            return callback(null, javaVersion.trim());
        } else {
            // reportStatus('java', false);
        }
    });
    spawn.on('exit', function(code) {
        if(code != 0) {
            reportStatus('java', false);
        }
    })
}

/**
 * calls the callback with the java version we found
 * 
 * @param {*} reportStatus 
 */
const java = function(reportStatus) {
    javaversion(function(err,version){
        if(version) {
            const v = version.split('.');
            reportStatus('java', true, v);
        } else {
            reportStatus('java', true, version);
        }
    });
}

/**
 * calls the callback with the maven version we found
 * 
 * @param {*} reportStatus 
 */
const maven = function(reportStatus) {
    try {
        require('maven').create({quiet: true}).execute(['--version']).then( () => {
            reportStatus('mvn', true, 'not parsed');
        });
    } catch( error ) {
        reportStatus('mvn', false);
    }
}

/**
 * reports a failure to the callback
 * 
 * @param {*} reportStatus 
 */
const fail = function(reportStatus) {
    reportStatus('fail', false);
}

/**
 * list of available version reporters
 * 
 */
const available = {
    java: java,
    maven: maven,
    fail: fail
}

/**
 * current status
 * 
 */
const status = {

}

/**
 * checks the given [<tech>,...] and reports back the version to the callback
 * [<tech>] can be set to ['available'] to report on all
 * 
 * @param {String} tech 
 * @param {function} cb 
 */
function checkAvailable(tech, cb) {

    function reportStatus(technology, techstatus, version = undefined) {
        status[technology] = { available: techstatus, version };
        if(Object.keys(status).length === tech.length) {
            let allok = true;
            Object.keys(status).forEach(key => {
                stat = status[key];
                console.log(key,stat.available,stat.version);
                if(stat.available === false) allok = false; // yes, we could do this with an AND
            })
            if(allok) {
                console.log('all checks passed');
            } else {
                console.log('at least one check failed');
            }
            cb(allok, status);
        }
    }
    
    if(tech.length === 0) {
        console.log('checking all')
        for(key in available) {
            available[key](reportStatus);
        }
    } else {
        if(tech[0] === 'available') {
            console.log('available checks:');
            Object.keys(available).forEach(key => console.log(key));
        } else {
            tech.forEach( arg => {
                available[arg](reportStatus);
            })
        }
    }
}

/* exports its checkAvailable method */
module.exports = checkAvailable