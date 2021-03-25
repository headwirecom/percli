// USAGE
// node lib/replication/remote.js http://admin:admin@author.com/content/tenant http://admin:admin@publish.com/content/tenant

const axios = require('axios')
const lodash = require('lodash')

const SKIP_PROPS = ['jcr:uuid', 'jcr:lastModified', 'jcr:lastModifiedBy']

const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')

const args = process.argv.slice(2)
let index = 0
const [stageHost, stageTenantPath] = network.extractHostAndPath(args[index++])
const [liveHost, liveTenantPath] = network.extractHostAndPath(args[index++])
Promise.all([
    perapi.findRenderableFiles(stageHost, stageTenantPath, {
        headers: {
            'x-per-version-label': 'Published'
        }
    }),
    perapi.findRenderableFiles(liveHost, liveTenantPath)
]).then(([stageFiles, liveFiles]) => {
    const stageNodes = consts.extractResourcesFromFiles(stageFiles)
    const liveNodes = consts.extractResourcesFromFiles(liveFiles)
    console.log('* Any calls to stage use versions labeled \'Published\'.')
    console.log('=============================================================================')
    console.log('* VALID CHECKS')
    console.log('=============================================================================')
    const commonNodes = stageNodes.filter(x => liveNodes.includes(x))
    console.log(`Found ${commonNodes.length} nodes present both in stage and live:`)
    consts.printResources(commonNodes)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    const missingLive = stageNodes.filter(x => !liveNodes.includes(x))
    console.log(`Found ${missingLive.length} nodes present in stage, but missing live:`)
    consts.printResources(missingLive)
    const missingStage = liveNodes.filter(x => !stageNodes.includes(x))
    console.log(`Found ${missingStage.length} nodes missing in stage, but present live:`)
    consts.printResources(missingStage)
    
    compareContent(stageFiles.filter(x => liveFiles.includes(x)))
})

function compareContent(files) {
    const fetchPromises = []
    for (const path of files) {
        fetchPromises.push(axios.get(stageHost + path, {
            headers: {
                'x-per-version-label': 'Published'
            }
        }))
        fetchPromises.push(axios.get(liveHost + path))
    }

    Promise.all(fetchPromises).then(contents => {
        const changedFiles = []
        const changedJsons = []
        for (let i = 0, j = 0; i < contents.length; i++, j++) {
            const path = files[j]
            const stageContent = contents[i].data
            const liveContent = contents[++i].data
            if (stageContent === liveContent) {
                continue
            }

            if (path.endsWith(consts.JSON) && typeof stageContent === 'object' && typeof liveContent === 'object') {
                if (!isEqual(stageContent, liveContent)) {
                    changedJsons.push(path)
                }
            } else {
                changedFiles.push(path)
            }
        }

        console.log(`The following ${changedFiles.length} files differ when comparing stage version to live version (note that these might be false positives for 'html' as the comparison method is very crude):`)
        consts.printResources(changedFiles)

        console.log(`The following ${changedJsons.length} JSON files differ when comparing stage version to live version (deep compare was used):`)
        consts.printResources(changedJsons)
    }).catch(console.log)
}

function isEqual(value, other) {
    if (lodash.isEqualWith(value, other)) {
        return true
    }

    const cleanValue = clearObject(value)
    const cleanOther = clearObject(other)
    return lodash.isEqualWith(cleanValue, cleanOther)
}

function clearObject(obj) {
    const result = { }
    for (const key in obj) {
        if (SKIP_PROPS.includes(key)) {
            continue
        }

        const value = obj[key]
        const type = typeof value
        if (type == 'string') {
            result[key] = value
        } else {
            result[key] = clearObject(value)
        }
    }

    return result
}
