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
const files = findAllFilesRecursively(tenantDirPath)
const checked = {
    notFound: [],
    changed: [],
    same: []
}

let i = 0
for (const filePath of files.check) {
    const path = filePath.substring(rootDirPath.length)
    protocol.get(host + path, {
        headers: {
            // 'x-per-version-label': 'Published'
        }
    }, res => {
        i++
        if (res.statusCode !== 200) {
            checked.notFound = checked.notFound.concat(path)
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
                checked.changed = checked.changed.concat(path)
            } else {
                checked.same = checked.same.concat(path)
            }

            if (files.check.length == i) {
                printInfo()
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

function printInfo() {
    console.log('=============================================================================')
    console.log('* VALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of skipped system files: ${files.system.length}`)
    console.log(`# of skipped '[...]${RENDITIONS}' directories: ${files.renditions.length}`)
    console.log(`# of skipped '[...]${THUMBNAIL}' files: ${files.thumbnails.length}`)
    console.log(`# of checked files that match server state: ${checked.same.length}`)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    console.log(`# of files not found on the server: ${checked.notFound.length}`)
    checked.notFound.sort()
    i = 1
    const notFoundResources = []
    for (const path of checked.notFound) {
        console.log(`\t${i++}) ${path}`)
        addUniqueWithoutSuffix(notFoundResources, path)
    }

    console.log(`# of corresponding resources: ${notFoundResources.length}`)
    notFoundResources.sort()
    i = 1
    for (const path of notFoundResources) {
        console.log(`\t${i++}) ${path}`)
    }

    console.log(`# of files changed on the server: ${checked.changed.length}`)
    checked.changed.sort()
    i = 1
    const changedResources = []
    for (const path of checked.changed) {
        console.log(`\t${i++}) ${path}`)
        addUniqueWithoutSuffix(changedResources, path)
    }

    console.log(`# of corresponding resources: ${changedResources.length}`)
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