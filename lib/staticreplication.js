// USAGE
// node lib/staticreplication.js /Users/user/Work/perserver/sling/staticreplication http://admin:admin@localhost:8080/content/tenant

const fs = require('fs')

const args = process.argv.slice(2)
let index = 0
const rootDirPath = args[index++]
const [host, tenantPath] = extractHostAndPath(args[index++])
const tenantDirPath = rootDirPath + tenantPath
checkFilesRecursively(tenantDirPath)

function extractHostAndPath(url) {
    let index = url.indexOf('://')
    const protocolEnd = index > 0 ? index + 3 : 0
    index = protocolEnd + url.substring(protocolEnd).indexOf('/')
    return [url.substring(0, index), url.substring(index)]
}

function checkFilesRecursively(rootPath) {
    fs.readdir(rootPath, (err, files) => {
        files.forEach(path => {
            const fullPath = rootPath + '/' + path
            if (fs.lstatSync(fullPath).isDirectory()) {
                checkFilesRecursively(fullPath)
            } else {
                console.log(fullPath)
            }
        })
    })
}
