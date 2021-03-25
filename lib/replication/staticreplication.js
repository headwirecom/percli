// USAGE
// node lib/replication/staticreplication.js http://admin:admin@localhost:8080/content/tenant /Users/user/Work/perserver/sling/staticreplication

const fs = require('fs')
const axios = require('axios')

const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')

const args = process.argv.slice(2)
let index = 0
const [host, tenantPath] = network.extractHostAndPath(args[index++])
const rootDirPath = args[index++]
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
    axios.get(host + path/*, perapi.PUBLISH_HEADERS*/).then(res => {
        const localFileContent = fs.readFileSync(filePath, {
            encoding: 'utf8',
            flag: 'r'
        })
        if (res.data !== localFileContent) {
            checkedLive.changed = checkedLive.changed.concat(path)
        } else {
            checkedLive.same = checkedLive.same.concat(path)
        }

        onNextFileFetched(++i)
    }).catch(err => {
        checkedLive.notFound = checkedLive.notFound.concat(path)
        onNextFileFetched(++i)
    })
}

function onNextFileFetched(index) {
    if (filesLive.check.length == index) {
        printLivePOVConsistencyInfo()
        checkConsistencyFromStagePOV()
    }
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
    console.log(`# of skipped live files from underlying OS: ${filesLive.system.length}`)
    console.log(`# of skipped live '[...]${consts.RENDITIONS}' directories: ${filesLive.renditions.length}`)
    console.log(`# of skipped live '[...]${consts.THUMBNAIL}' files: ${filesLive.thumbnails.length}`)
    console.log(`# of checked live files that match staged state: ${checkedLive.same.length}`)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of live files not found on the stage server: ${checkedLive.notFound.length}`)
    checkedLive.notFound.sort()
    consts.printResources(checkedLive.notFound)

    const notFoundResources = consts.extractResourcesFromFiles(checkedLive.notFound)
    console.log(`# of corresponding staged resources: ${notFoundResources.length}`)
    notFoundResources.sort()
    consts.printResources(notFoundResources)

    console.log(`# of live files changed on the stage server: ${checkedLive.changed.length}`)
    checkedLive.changed.sort()
    consts.printResources(checkedLive.changed)

    const changedResources = consts.extractResourcesFromFiles(checkedLive.changed)
    console.log(`# of corresponding staged resources: ${changedResources.length}`)
    changedResources.sort()
    consts.printResources(changedResources)
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
    consts.printResources(resources)

    console.log(`# of corresponding live files: ${missingFiles.length}`)
    consts.printResources(missingFiles)
}
