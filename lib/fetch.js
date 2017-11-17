const axios = require('axios')
const fs    = require('fs-extra')

/**
    * Downloads the file from the url
    * @param {string} url - the url
    * @param {string} file - file
*/
function download(url, file){
  return new Promise( (resolve, reject) => {
    axios({
      method:'get',
      url: url,
      responseType:'stream'
    })
    .then(res => {
      let bytes = 0
      let lastBytes = 0
      let stream = res.data.pipe(fs.createWriteStream(`out/${file}`))
      stream.on('finish', () => {
          console.log(`${url} download complete`)
          resolve()
      })
      stream.on('error', reject)
      res.data.on('data', (chunk) => {
          bytes += chunk.length
          let total = Math.floor(bytes/1024/1024/10)
          if(lastBytes !== total) {
              lastBytes = total
              console.log(`${lastBytes*10}MB of ${url} downloaded`)
          }
      })
    })
    .catch(err => { 
        reject(`err downloading ${file}`)
    })
  })
}

module.exports = {

    /**
        * Fetches the url with axios
        * @param {string} url - the url
        * @return {string} the url
    */
    fetch(url){
        return axios.get(url)
    },

    /**
        * Downloads the file from the url
        * @param {string} url - the url
        * @param {string} file - file
        * @return {download} the download
    */
    downloadFile(url, file){
        return download(url, file)
    },

    /**
        * Downloads all of the peregrine packages
        * @param {array} packages - the packages
        * @return {download} the download
    */
    downloadFiles(packages){
        return axios.all(packages.map(package => {
            return download(`https://vagrant.headwire.com/peregrine/${package}`, package)
        }))
    }
}
