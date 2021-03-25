require('./string')

const axios = require('axios')
const consts = require('./constants')

const NODES_INFO_PATH = '/perapi/admin/nodes.json'
exports.PUBLISH_HEADERS = {
    headers: {
        'x-per-version-label': 'Published'
    }
}

function grabNodesInfo(host, path, options = {}) {
    return axios.get(host + NODES_INFO_PATH + path, options)
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

async function grabChildrenNodesInfo(node, host, options = {}) {
    const children = (node?.hasChildren && node?.children) || []
    const fullChildren = await Promise.all(children.map(child => grabNodesInfo(host, child.path, options)))
    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        child.children = fullChildren[i].children || []
        await grabChildrenNodesInfo(child, host, options)
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

exports.findRenderableFiles = function(host, path, options = {}) {
    return grabNodesInfo(host, path, options)
        .then(node => grabChildrenNodesInfo(node, host, options))
        .then(extractRenderableFilesFromNodesTree)
}

exports.findRenderableFilesPublished = function(host, path) {
    return exports.findRenderableFiles(host, path, exports.PUBLISH_HEADERS)
}
