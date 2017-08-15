const fs        = require('fs')
const http      = require('http')
const { spawn } = require('child_process')
const open      = require('open')
const { fetch } = require('./fetch')
const maven     = require('maven')
const os        = require('os')
const path      = require('path')

let port = 8080

function startSling(type) {

    const args = ['-jar','out/sling-9.jar'];

    if(type === 'standalone') {
        // do nothing
    } else if(type === 'author') {
        args.push("-Dsling.run.modes=author,notshared")
    } else if(type === 'publish') {
        args.push("-Dsling.run.modes=publish,notshared")
        args.push("-p")
        args.push("8180")
        port = 8180
    }

    console.log(args)

    const child = spawn('java', args, {
        detached: true,
        shell: true,
        stdio: 'inherit'
    })
    child.unref()
}

function checkIfRunning(errorWhenRunning = true) {
    return new Promise((resolve, reject) => {
        http.get('http://admin:admin@localhost:'+port+'/system/console/bundles.json', function(res) {
            let rawData = '';
            res.on('data', chunk => { rawData += chunk; });
            res.on('end', () => {
                try {
                    let status = JSON.parse(rawData).s
                    console.log('status', status)
                    if(status[3] === 0 && status[4] === 0) {
                        if(errorWhenRunning) { 
                            reject() 
                        } else { 
                            resolve() 
                        }
                    } else {
                        if(errorWhenRunning) { 
                            resolve() 
                        } else { 
                            reject() 
                        }
                    }
                } catch (e) {
                    console.error(e.message);
                    reject()
                }
            })
        }).on('error', e => {
            if(e.code === 'ECONNREFUSED') {
                if(errorWhenRunning) { 
                    resolve() 
                } else { 
                    reject() 
                }
            }
            //console.error(`Got error: ${JSON.stringify(e)}`);
        })
    })
}

async function wait(time){
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time)
    })
}

async function waitUntilRunning() {
    let stopped = true
    while(stopped){
        await wait(1000)
        await checkIfRunning(false)
            .then( () => {
                stopped = false
                console.log('sling already running')
            })
            .catch( () => {
                console.log('waiting for sling to start');  
            })

    }
}

function getSettings() {
    return path.join(os.homedir(), '.pcms-servers')
}

function listServers() {
    const settingsFile = getSettings()
    if(fs.existsSync(settingsFile)) {
        console.log()
        console.log('[INFO] list of all peregrine-cms servers on this computer')
        const settings = JSON.parse(fs.readFileSync(getSettings()).toString())
        console.log()
        settings.forEach( (server) => {
            console.log('-', server.name, server.path)
        })
    } else {
        console.error('[ERROR] no settings file found at', settingsFile)
    }
}

function addServer(name, path) {
    const settingsFile = getSettings()
    let settings = []
    if(fs.existsSync(settingsFile)) {
        console.log('list of all peregrine-cms servers on this computer')
        settings = JSON.parse(fs.readFileSync(getSettings()).toString())
    }
    settings.push( {name: name, path: path})
    fs.writeFileSync(settingsFile, JSON.stringify(settings, true, 2))
}

function getPathForServer(name) {
    const settingsFile = getSettings()
    let settings = []
    if(fs.existsSync(settingsFile)) {
        settings = JSON.parse(fs.readFileSync(getSettings()).toString())
        for(let i = 0; i < settings.length; i++) {
            if(settings[i].name === name) {
                return settings[i].path
            }
        }
    }
}

module.exports = {
    startPeregrine(type) {
        return new Promise((resolve, reject) => checkIfRunning().then(() => {
            console.log('sling is not running')
            startSling(type)
            waitUntilRunning().then((msg) => {
                console.log(msg)
                setTimeout( () => { open("http://localhost:"+port+"/index.html") }, 2000);
                resolve()
            })
        }).catch(() => {
            console.log('found an already running sling instance, aborting start')
            reject()
        })
        )
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
                "sling.port": port,
                "vault.file": "out/" + line,
                "vault.serviceURL": "http://localhost:"+port+"/bin/cpm/package.service.html"
            }
        )
    },
    installPackages: async function(packages){
        let mvn = maven.create()
        for(let i = 0; i < packages.length; i++) {
            await module.exports.installFile(mvn, packages[i])
        }
    },

    setPort: function(newPort) {
        port = newPort
    },

    listServers: function() {
        listServers()
    },

    addServer: function(name, path) {
        addServer(name, path)
    },

    getPathForServer(name) {
        return getPathForServer(name)
    }
}