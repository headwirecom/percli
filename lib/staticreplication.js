// USAGE
// node lib/staticreplication.js /Users/user/Work/perserver/sling/staticreplication http://admin:admin@localhost:8080/content/tenant

String.prototype.endsWith = function(suffix) {
    const length = this.length
    return this.substring(length - suffix.length, length) === suffix
}

String.prototype.substringBeforeLast = function(suffix) {
    if (this.endsWith(suffix)) {
        return this.substring(0, this.length - suffix.length)
    }

    return this
}

const fs = require('fs')
const http = require('http')
const https = require('https')

const RENDITIONS = '_/renditions'
const THUMBNAIL = '.thumbnail.png'
const HTML = '.html'
const INFINITY = '.infinity.json'
const DATA = '.data.json'
const SUFFIXES = [HTML, INFINITY, DATA]

const args = process.argv.slice(2)
let index = 0
const rootDirPath = args[index++]
const [host, tenantPath] = extractHostAndPath(args[index++])
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
            }
        })
    })
}

function extractHostAndPath(url) {
    let index = url.indexOf('://')
    const protocolEnd = index > 0 ? index + 3 : 0
    index = protocolEnd + url.substring(protocolEnd).indexOf('/')
    return [url.substring(0, index), url.substring(index)]
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
        const length = fullPath.length
        if (fs.lstatSync(fullPath).isDirectory()) {
            if (fullPath.endsWith(RENDITIONS)) {
                result = result.concat({ renditions: fullPath })
            } else {
                result = result.concat(findAllFilesRecursively(fullPath))
            }
        } else if (fileName === '.DS_Store') {
            result = result.concat({ system: fullPath })
        } else if (fullPath.endsWith(THUMBNAIL)) {
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
    console.log(`# of skipped live system files: ${filesLive.system.length}`)
    console.log(`# of skipped live '[...]${RENDITIONS}' directories: ${filesLive.renditions.length}`)
    console.log(`# of skipped live '[...]${THUMBNAIL}' files: ${filesLive.thumbnails.length}`)
    console.log(`# of checked live files that match staged state: ${checkedLive.same.length}`)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of live files not found on the stage server: ${checkedLive.notFound.length}`)
    checkedLive.notFound.sort()
    i = 1
    const notFoundResources = []
    for (const path of checkedLive.notFound) {
        console.log(`\t${i++}) ${path}`)
        addUniqueWithoutSuffix(notFoundResources, path)
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
    const changedResources = []
    for (const path of checkedLive.changed) {
        console.log(`\t${i++}) ${path}`)
        addUniqueWithoutSuffix(changedResources, path)
    }

    console.log(`# of corresponding staged resources: ${changedResources.length}`)
    changedResources.sort()
    i = 1
    for (const path of changedResources) {
        console.log(`\t${i++}) ${path}`)
    }
}

function addUniqueWithoutSuffix(array, path) {
    const string = trimSuffix(path)
    if (!array.includes(string)) {
        array.push(string)
    }
}

function trimSuffix(path) {
    for (suffix of SUFFIXES) {
        if (path.endsWith(suffix)) {
            return path.substringBeforeLast(suffix)
        }
    }

    return path
}