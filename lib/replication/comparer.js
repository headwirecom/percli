const lodash = require('lodash')
const consts = require('./constants')
const SKIP_PROPS = ['jcr:uuid', 'jcr:lastModified', 'jcr:lastModifiedBy']

exports.compare = function(contents) {
    const changedFiles = []
    const changedJsons = []
    for (const content of contents) {
        const { path, stage, live } = content
        if (stage === live) {
            continue
        }

        if (path.endsWith(consts.JSON) && typeof stage === 'object' && typeof live === 'object') {
            if (!isEqual(stage, live)) {
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
