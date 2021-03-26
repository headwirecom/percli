// USAGE
// node lib/replication/remote.js http://admin:admin@author.com/content/tenant http://admin:admin@publish.com/content/tenant

const axios = require('axios')
const consts = require('./constants')
const network = require('./network')
const perapi = require('./perapi')
const comparer = require('./comparer')

console.log('* Any calls to stage use versions labeled \'Published\'.')
const args = process.argv.slice(2)
let index = 0
const [stageHost, stageTenantPath] = network.extractHostAndPath(args[index++])
const [liveHost, liveTenantPath] = network.extractHostAndPath(args[index++])
Promise.all([
    perapi.findRenderableFilesPublished(stageHost, stageTenantPath),
    perapi.findRenderableFiles(liveHost, liveTenantPath)
]).then(([stage, live]) => {
    comparer.compareFilePaths(stage, live)
    compareContent(stage.filter(x => live.includes(x)))
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

        comparer.compareContents(input)
    }).catch(console.log)
}
