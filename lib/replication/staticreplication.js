// USAGE
// node lib/replication/staticreplication.js http://admin:admin@localhost:8080/content/tenant /Users/user/Work/perserver/sling/staticreplication

const fs = require('fs')
const http = require('http')
const https = require('https')

const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')

const args = process.argv.slice(2)
let index = 0
const [host, tenantPath] = network.extractHostAndPath(args[index++])
const rootDirPath = args[index++]
const protocol = host.toLowerCase().indexOf('https') == 0 ? https : http
const tenantDirPath = rootDirPath + tenantPath
const filesLive = findAllFilesRecursively(tenantDirPath)
const checkedLive = {
    notFound: [],
    changed: [],
    same: []
}

let i = 0
for (const filePath of filesLive.check) {
    const path = filePath.substring(rootDirPath.length)
    protocol.get(host + path, {
        headers: {
            // 'x-per-version-label': 'Published'
        }
    }, res => {
        i++
        if (res.statusCode !== 200) {
            checkedLive.notFound = checkedLive.notFound.concat(path)
            return
        }

        const localFileContent = fs.readFileSync(filePath, {
            encoding: 'utf8',
            flag: 'r'
        })
        let remoteFileContent = ''
        res.on('data', chunk => { remoteFileContent += chunk })
        res.on('end', () => {
            if (remoteFileContent !== localFileContent) {
                checkedLive.changed = checkedLive.changed.concat(path)
            } else {
                checkedLive.same = checkedLive.same.concat(path)
            }

            if (filesLive.check.length == i) {
                printLivePOVConsistencyInfo()
                checkConsistencyFromStagePOV()
            }
        })
    })
}

function filesSearchResult(base) {
    return {
        check: base?.check || [],
        system: base?.system || [],
        renditions: base?.renditions || [],
        thumbnails: base?.thumbnails || [],
        concat: function(base) {
            this.check = this.check.concat(base?.check || [])
            this.system = this.system.concat(base?.system || [])
            this.renditions = this.renditions.concat(base?.renditions || [])
            this.thumbnails = this.thumbnails.concat(base?.thumbnails || [])
            return this
        }
    }
}

function findAllFilesRecursively(rootPath) {
    let result = filesSearchResult()
    fs.readdirSync(rootPath).forEach(fileName => {
        const fullPath = rootPath + '/' + fileName
        if (fs.lstatSync(fullPath).isDirectory()) {
            if (fullPath.endsWith(consts.RENDITIONS)) {
                result = result.concat({ renditions: fullPath })
            } else {
                result = result.concat(findAllFilesRecursively(fullPath))
            }
        } else if (fileName === '.DS_Store') {
            result = result.concat({ system: fullPath })
        } else if (fullPath.endsWith(consts.THUMBNAIL)) {
            result = result.concat({ thumbnails: fullPath })
        } else {
            result = result.concat({ check: fullPath })
        }
    })

    return result
}

function printLivePOVConsistencyInfo() {
    console.log('=============================================================================')
    console.log('* VALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of skipped live files frm underlying OS: ${filesLive.system.length}`)
    console.log(`# of skipped live '[...]${consts.RENDITIONS}' directories: ${filesLive.renditions.length}`)
    console.log(`# of skipped live '[...]${consts.THUMBNAIL}' files: ${filesLive.thumbnails.length}`)
    console.log(`# of checked live files that match staged state: ${checkedLive.same.length}`)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of live files not found on the stage server: ${checkedLive.notFound.length}`)
    checkedLive.notFound.sort()
    i = 1
    const notFoundResources = consts.extractResourcesFromFiles(checkedLive.notFound)
    for (const path of checkedLive.notFound) {
        console.log(`\t${i++}) ${path}`)
    }

    console.log(`# of corresponding staged resources: ${notFoundResources.length}`)
    notFoundResources.sort()
    i = 1
    for (const path of notFoundResources) {
        console.log(`\t${i++}) ${path}`)
    }

    console.log(`# of live files changed on the stage server: ${checkedLive.changed.length}`)
    checkedLive.changed.sort()
    i = 1
    const changedResources = consts.extractResourcesFromFiles(checkedLive.changed)
    for (const path of checkedLive.changed) {
        console.log(`\t${i++}) ${path}`)
    }

    console.log(`# of corresponding staged resources: ${changedResources.length}`)
    changedResources.sort()
    i = 1
    for (const path of changedResources) {
        console.log(`\t${i++}) ${path}`)
    }
}

function checkConsistencyFromStagePOV() {
    perapi.findRenderableFiles(host, tenantPath)
        .then(array => array.filter(x => !filesLive.check.includes(rootDirPath + x)))
        .then(printStagePOVConsistencyInfo)
}

function printStagePOVConsistencyInfo(missingFiles) {
    missingFiles.sort()
    const resources = consts.extractResourcesFromFiles(missingFiles)
    console.log(`# of staged pages / assets / objects not found in the live folder: ${resources.length}`)
    i = 1
    for (const path of resources) {
        console.log(`\t${i++}) ${path}`)
    }

    console.log(`# of corresponding live files: ${missingFiles.length}`)
    i = 1
    for (const path of missingFiles) {
        console.log(`\t${i++}) ${path}`)
    }
}
