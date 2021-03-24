// USAGE
// node lib/replication/remote.js http://admin:admin@author.com/content/tenant http://admin:admin@publish.com/content/tenant

const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')

const args = process.argv.slice(2)
let index = 0
const [stageHost, stageTenantPath] = network.extractHostAndPath(args[index++])
const [liveHost, liveTenantPath] = network.extractHostAndPath(args[index++])
Promise.all([
    perapi.findRenderableResources(stageHost, stageTenantPath),
    perapi.findRenderableResources(liveHost, liveTenantPath)
]).then(([stageNodes, liveNodes]) => {
    console.log('=============================================================================')
    console.log('* VALID CHECKS')
    console.log('=============================================================================')
    const common = stageNodes.filter(x => liveNodes.includes(x))
    console.log(`Found ${common.length} nodes present both in stage and live:`)
    consts.printResources(common)

    console.log('=============================================================================')
    console.log('* INVALID CHECKS')
    console.log('=============================================================================')
    const missingLive = stageNodes.filter(x => !liveNodes.includes(x))
    console.log(`Found ${missingLive.length} nodes present in stage, but missing live:`)
    consts.printResources(missingLive)
    const missingStage = liveNodes.filter(x => !stageNodes.includes(x))
    console.log(`Found ${missingStage.length} nodes missing in stage, but present live:`)
    consts.printResources(missingStage)
})
