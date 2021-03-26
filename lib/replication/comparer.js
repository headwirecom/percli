const lodash = require('lodash')
const consts = require('./constants')
const SKIP_PROPS = ['jcr:uuid', 'jcr:lastModified', 'jcr:lastModifiedBy']

exports.compareFilePaths = function(stage, live) {
    const stageNodes = consts.extractResourcesFromFiles(stage)
    const liveNodes = consts.extractResourcesFromFiles(live)
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
}

exports.compareContents = function(contents) {
    const changedFiles = []
    const changedJsons = []
    for (const content of contents) {
        const { path, stage, live } = content
        if (stage === live) {
            continue
        }

        if (path.endsWith(consts.JSON)) {
            if (!isEqual(
                typeof stage === 'string' ? JSON.parse(stage) : stage,
                typeof live === 'string' ? JSON.parse(live) : live
            )) {
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
