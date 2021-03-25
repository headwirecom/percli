// USAGE
// node lib/replication/remote.js http://admin:admin@author.com/content/tenant http://admin:admin@publish.com/content/tenant

const axios = require('axios')
const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')
const comparer = require('./comparer')

const args = process.argv.slice(2)
let index = 0
const [stageHost, stageTenantPath] = network.extractHostAndPath(args[index++])
const [liveHost, liveTenantPath] = network.extractHostAndPath(args[index++])
Promise.all([
    perapi.findRenderableFilesPublished(stageHost, stageTenantPath),
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
        fetchPromises.push(axios.get(stageHost + path, perapi.PUBLISH_HEADERS))
        fetchPromises.push(axios.get(liveHost + path))
    }

    Promise.all(fetchPromises).then(contents => {
        const input = []
        for (let i = 0, j = 0; i < contents.length; i++, j++) {
            input.push({
                path: files[j],
                stage: contents[i].data,
                live: contents[++i].data
            })
        }

        comparer.compare(input)
    }).catch(console.log)
}
