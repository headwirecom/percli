const fs        = require('fs')
const http      = require('http')
const { spawn } = require('child_process')
const open      = require('open')
const { fetch } = require('./fetch')
const maven     = require('maven')

function startSling() {

    const child = spawn('java', ['-jar','out/sling-9.jar'], {
        detached: true,
        shell: true,
        stdio: 'inherit'
    });

    child.unref();
}

const checkIfRunning = function (errorWhenRunning = true) {
    return new Promise((resolve, reject) => {
        http.get('http://admin:admin@localhost:8080/system/console/bundles.json', function(res) {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    let status = JSON.parse(rawData).s
                    console.log('status', status)
                    if(status[3] === 0 && status[4] === 0) {
                        if(errorWhenRunning) { reject() } else { resolve() }
                    } else {
                        if(errorWhenRunning) { resolve() } else { reject() }
                    }
                } catch (e) {
                    console.error(e.message);
                    reject()
                }
            });
        }).on('error', (e) => {
            if(e.code === 'ECONNREFUSED') {
                if(errorWhenRunning) { resolve() } else { reject() }
            }
            //console.error(`Got error: ${JSON.stringify(e)}`);
        })
    })
}

function waitUntilRunning() {
    // this should loop until sling is running, kind of dangerous since it's currently recursive
    return new Promise( (resolve, reject) => {
        checkIfRunning(false)
            .then( () => {
                console.log('running')
                resolve()
            })
            .catch( () => {
                console.log('waiting for sling to start');  setTimeout(() => { waitUntilRunning().then(() => { resolve() })}, 1000)
            })
    })
}

module.exports = {
    startPeregrine() {
        checkIfRunning().then(() => {
            console.log('sling is not running')
            startSling()
            waitUntilRunning().then(() => {
                console.log('server is up and running')
                setTimeout( () => { open("http://localhost:8080/index.html") }, 2000);
            })
        }).catch(() => {
            console.log('found an already running sling instance, aborting start')
        })
    },
    getPackageList() {
        return new Promise( (resolve, reject) => {
            fetch('https://vagrant.headwire.com/peregrine/packages.txt')
                .then(res => { resolve(res.data.split('\n').filter(line => line.length > 0)) })
                .catch(err => { reject(err) })
        })
    },
    installFile: async function(mvn, line) {
        return mvn.execute(
            ['io.wcm.maven.plugins:wcmio-content-package-maven-plugin:install'], 
            {
                "sling.port": "8080",
                "vault.file": "out/" + line,
                "vault.serviceURL": "http://localhost:8080/bin/cpm/package.service.html"
            }
        )
    },
    installPackages: async function(packages){
        console.log('time to install')
        let mvn = maven.create()
        let files = packages.filter((package) => { return package.length != 0})
        for(let i = 0; i < files.length; i++) {
            await module.exports.installFile(mvn, files[i])
        }
    }
}