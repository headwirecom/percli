// USAGE
// node lib/replication/staticreplication.js http://admin:admin@localhost:8080/content/tenant /Users/user/Work/perserver/sling/staticreplication

const fs = require('fs')
const axios = require('axios')

const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')
const comparer = require('./comparer')

console.log('* Any calls to stage use versions labelled \'Published\'.')
const args = process.argv.slice(2)
const [host, tenantPath] = network.extractHostAndPath(args[0])
const rootDirPath = args[1]
const tenantDirPath = rootDirPath + tenantPath
const liveFilePathsBreakdown = findAllFilesRecursively(tenantDirPath)

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
            result = result.concat({ toBeChecked: fullPath })
        }
    })

    return result
}

function filesSearchResult(base) {
    return {
        toBeChecked: base?.toBeChecked || [],
        system: base?.system || [],
        renditions: base?.renditions || [],
        thumbnails: base?.thumbnails || [],
        concat: function(base) {
            this.toBeChecked = this.toBeChecked.concat(base?.toBeChecked || [])
            this.system = this.system.concat(base?.system || [])
            this.renditions = this.renditions.concat(base?.renditions || [])
            this.thumbnails = this.thumbnails.concat(base?.thumbnails || [])
            return this
        }
    }
}

console.log('=============================================================================')
console.log('* EXCLUSIONS')
console.log('=============================================================================')
console.log(`# of skipped live files from underlying OS: ${liveFilePathsBreakdown.system.length}`)
console.log(`# of skipped live '[...]${consts.RENDITIONS}' directories: ${liveFilePathsBreakdown.renditions.length}`)
console.log(`# of skipped live '[...]${consts.THUMBNAIL}' files: ${liveFilePathsBreakdown.thumbnails.length}`)

perapi.findRenderableFilesPublished(host, tenantPath).then(stageFiles => {
    const liveFiles = liveFilePathsBreakdown.toBeChecked.map(s => s.substringAfter(rootDirPath))
    const missingLiveFiles = liveFiles.filter(x => !stageFiles.includes(x))
    let stagedCount = 0
    for (let path of missingLiveFiles) {
        axios.get(host + path, perapi.PUBLISH_HEADERS).then(() => {
            stageFiles.push(path)
            continueIfMissingFilesChecked()
        }).catch(continueIfMissingFilesChecked)
    }

    function continueIfMissingFilesChecked() {
        stagedCount++
        if (stagedCount == missingLiveFiles.length) {
            const pathsOk = comparer.compareFilePaths(stageFiles, liveFiles)
            compareContent(stageFiles.filter(x => liveFiles.includes(x))).then(res => {
                if (pathsOk && res) {
                    console.log(0)
                    process.exit(0)
                } else {
                    console.log(1)
                    process.exit(1)
                }
            }).catch(err => {
                console.log(err)
                process.exit(1)
            })
        }
    }

})

function compareContent(files) {
    return Promise.all(
        files.map(path => axios.get(host + path, perapi.PUBLISH_HEADERS))
    ).then(contents => {
        const input = []
        for (let i = 0; i < contents.length; i++) {
            const path = files[i]
            input.push({
                path,
                stage: contents[i].data,
                live: fs.readFileSync(rootDirPath + path, {
                    encoding: 'utf8',
                    flag: 'r'
                })
            })
        }

        return comparer.compareContents(input)
    })
}
