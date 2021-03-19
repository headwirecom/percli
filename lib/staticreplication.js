// USAGE
// node lib/staticreplication.js /Users/user/Work/perserver/sling/staticreplication http://admin:admin@localhost:8080/content/tenant

const fs = require('fs')
const http = require('http')
const https = require('https')

const args = process.argv.slice(2)
let index = 0
const rootDirPath = args[index++]
const [host, tenantPath] = extractHostAndPath(args[index++])
const protocol = host.toLowerCase().indexOf('https') == 0 ? https : http
const tenantDirPath = rootDirPath + tenantPath
const files = findAllFilesRecursively(tenantDirPath)

let i = 1
for (const filePath of files) {
    const path = filePath.substring(rootDirPath.length)
    protocol.get(host + path, {
        headers: {
            //'x-per-version-label': 'Published'
        }
    }, res => {
        if (res.statusCode !== 200) {
            console.log(`${i++}: File ${path} was not found on the server.`)
            return
        }

        const localFileContent = fs.readFileSync(filePath, {
            encoding:'utf8',
            flag:'r'
        })
        let remoteFileContent = ''
        res.on('data', chunk => { remoteFileContent += chunk })
        res.on('end', () => {
            if (remoteFileContent !== localFileContent) {
                console.log(`${i++}: File ${path} has changed.`)
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

function findAllFilesRecursively(rootPath) {
    let result = []
    fs.readdirSync(rootPath).forEach(fileName => {
        const fullPath = rootPath + '/' + fileName
        if (fs.lstatSync(fullPath).isDirectory()) {
            result = result.concat(findAllFilesRecursively(fullPath))
        } else {
            result = result.concat(fullPath)
        }
    })

    return result
}
