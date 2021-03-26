// USAGE
// node lib/replication/remote.js http://admin:admin@stage.per/content/tenant http://admin:admin@live.per/content/tenant

const axios = require('axios')
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
    const pathsOk = comparer.compareFilePaths(stage, live)
    compareContent(stage.filter(x => live.includes(x))).then(res => {
        if (pathsOk && res) {
            process.exit(0)
        } else {
            process.exit(1)
        }
    }).catch(err => {
        console.log(err)
        process.exit(1)
    })
})

function compareContent(files) {
    const fetchPromises = []
    for (const path of files) {
        fetchPromises.push(axios.get(stageHost + path, perapi.PUBLISH_HEADERS))
        fetchPromises.push(axios.get(liveHost + path))
    }

    return Promise.all(fetchPromises).then(contents => {
        const input = []
        for (let i = 0, j = 0; i < contents.length; i++, j++) {
            input.push({
                path: files[j],
                stage: contents[i].data,
                live: contents[++i].data
            })
        }

        return comparer.compareContents(input)
    })
}
