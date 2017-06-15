const asciify = require('asciify')
const SIZE = 'big'
const TEXT = 'peregrine cms'

function bannerIpml(text, size = SIZE){
	return new Promise( (resolve, reject) => {
	  asciify(text, {font: size}, function(err, res){ 
      if(err) reject(err)
      resolve(console.log(res))
	  })
	})
}

module.exports = {
	peregrineBanner(){
		return bannerIpml(TEXT)
	},
	banner(text, size){
		return bannerIpml(text, size)
	}
}
