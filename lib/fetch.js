const axios = require('axios')
const fs    = require('fs-extra')

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
  fetch(url){
    return axios.get(url)
  },
  downloadFile(url, file){
    return download(url, file)
  },
  downloadFiles(packages){
    return axios.all(packages.map(package => {
        return download(`https://vagrant.headwire.com/peregrine/${package}`, package)
    }))
  }
}
