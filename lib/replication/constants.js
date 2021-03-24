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