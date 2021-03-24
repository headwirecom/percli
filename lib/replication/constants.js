exports.RENDITIONS = '_/renditions'
exports.THUMBNAIL = '.thumbnail.png'
exports.HTML = '.html'
exports.INFINITY = '.infinity.json'
exports.DATA = '.data.json'
exports.SUFFIXES = [exports.HTML, exports.INFINITY, exports.DATA]

exports.trimSuffix = function(path) {
    for (suffix of exports.SUFFIXES) {
        if (path.endsWith(suffix)) {
            return path.substringBeforeLast(suffix)
        }
    }

    return path
}

exports.extractResourcesFromFiles = function(files) {
    const result = []
    for (const path of files) {
        const string = exports.trimSuffix(path)
        if (!result.includes(string)) {
            result.push(string)
        }
    }

    return result
}

exports.printResources = function(array) {
    let i = 1
    for (const path of array) {
        console.log(`\t${i++}) ${path}`)
    }
}