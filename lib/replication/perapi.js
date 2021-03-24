require('./string')

const axios = require('axios')
const consts = require('./constants')

const NODES_INFO_PATH = '/perapi/admin/nodes.json'

function grabNodesInfo(host, path) {
    return axios.get(host + NODES_INFO_PATH + path)
        .then(res => res.data)
        .then(res => findChildOfPath(res, path))
}

function findChildOfPath(node, path) {
    let result = node
    while (result?.path !== path && result?.hasChildren && result?.children) {
        result = result.children.filter(x => path.startsWith(`${x.path}/`) || x.path === path).pop()
    }

    return result
}

async function grabChildrenNodesInfo(node, host) {
    const children = (node?.hasChildren && node?.children) || []
    const fullChildren = await Promise.all(children.map(child => grabNodesInfo(host, child.path)))
    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        child.children = fullChildren[i].children || []
        await grabChildrenNodesInfo(child, host)
    }

    return node
}

function extractRenderableFilesFromNodesTree(root) {
    let result = []
    const { path, resourceType, children } = root
    if (resourceType === 'per:Asset') {
        result.push(path)
    } else if (resourceType === 'per:Page') {
        result.push(`${path}${consts.HTML}`)
        result.push(`${path}${consts.DATA}`)
    } else if (resourceType === 'per:Object') {
        result.push(`${path}${consts.INFINITY}`)
    }

    children.map(extractRenderableFilesFromNodesTree).forEach((e, i, a) => {
        result = result.concat(e)
    })
    return result
}

exports.findRenderableFiles = function(host, path) {
    return grabNodesInfo(host, path)
        .then(node => grabChildrenNodesInfo(node, host))
        .then(extractRenderableFilesFromNodesTree)
}

exports.findRenderableResources = function(host, path) {
    return exports.findRenderableFiles(host, path)
        .then(consts.extractResourcesFromFiles)
}
