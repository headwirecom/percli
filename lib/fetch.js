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
      let stream = res.data.pipe(fs.createWriteStream(`out/${file}`))
      stream.on('finish', resolve)
      stream.on('error', reject) 
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
