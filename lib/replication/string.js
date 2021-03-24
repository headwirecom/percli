String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0
}

String.prototype.endsWith = function(suffix) {
    const length = this.length
    return this.substring(length - suffix.length, length) === suffix
}

String.prototype.substringBeforeLast = function(suffix) {
    if (this.endsWith(suffix)) {
        return this.substring(0, this.length - suffix.length)
    }

    return this
}