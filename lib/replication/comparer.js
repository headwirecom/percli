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

    return missingLive.length + missingStage.length === 0
}

exports.compareContents = function(contents) {
    const changedFiles = []
    const changedHtmls = []
    const changedJsons = []
    for (const content of contents) {
        const { path, stage, live } = content
        if (stage === live) {
            continue
        }

        if (path.endsWith(consts.HTML)) {
            if (!isHtmlEqual(stage, live)) {
                changedHtmls.push(path)
            }
        } else if (path.endsWith(consts.JSON)) {
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

    console.log(`The following ${changedFiles.length} files differ when comparing stage version to live version:`)
    consts.printResources(changedFiles)

    console.log(`The following ${changedHtmls.length} HTML files differ when comparing stage version to live version (deep compare was used for <script id="perPage" />):`)
    consts.printResources(changedHtmls)

    console.log(`The following ${changedJsons.length} JSON files differ when comparing stage version to live version (deep compare was used):`)
    consts.printResources(changedJsons)

    return changedFiles.length + changedHtmls.length + changedJsons.length === 0
}

function isHtmlEqual(value, other) {
    if (value === other) {
        return true
    }

    const valueSplit = splitHtmlAgainstJson(value)
    if (!valueSplit) {
        return false
    }

    const otherSplit = splitHtmlAgainstJson(other)
    if (!otherSplit) {
        return false
    }

    if (valueSplit.rest !== otherSplit.rest) {
        return false
    }

    return isEqual(
        JSON.parse(valueSplit.json),
        JSON.parse(otherSplit.json)
    )
}

function splitHtmlAgainstJson(html) {
    let scriptStart = html.indexOf('<script id="perPage" data-per-path="')
    if (scriptStart == -1) {
        return
    }

    scriptStart += html.substring(scriptStart).indexOf('>')
    const prefix = html.substring(0, scriptStart + 1)
    const rest = html.substring(scriptStart + 1)
    const scriptEnd = rest.indexOf('</script>')
    if (scriptEnd == -1) {
        return
    }

    return {
        json: rest.substring(0, scriptEnd),
        rest: prefix + rest.substring(scriptEnd)
    }
}

function isEqual(value, other) {
    if (lodash.isEqual(value, other)) {
        return true
    }

    const cleanValue = clearObject(value)
    const cleanOther = clearObject(other)
    return lodash.isEqual(cleanValue, cleanOther)
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
