String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0
}

String.prototype.endsWith = function(suffix) {
    const length = this.length
    return this.substring(length - suffix.length, length) === suffix
}

String.prototype.removeSuffixIfPresent = function(suffix) {
    if (this.endsWith(suffix)) {
        return this.substring(0, this.length - suffix.length)
    }

    return this
}

String.prototype.substringAfter = function(prefix) {
    const index = this.indexOf(prefix)
    if (index > -1) {
        return this.substring(index + prefix.length, this.length)
    }

    return this
}
