const asciify = require('asciify')
const SIZE = 'big'
const TEXT = 'peregrine cms'

/**
    * Creates the banner
    * @param {string} text - the banner text
    * @param {string} size - the banner size
    * @return the banner
*/
function bannerIpml(text, size = SIZE){
	return new Promise( (resolve, reject) => {
	  asciify(text, {font: size}, function(err, res){ 
      if(err) reject(err)
      resolve(console.log(res))
	  })
	})
}

module.exports = {

    /**
        * Creates a big 'peregrine cms' banner
        * @return the banner
    */
	peregrineBanner(){
		return bannerIpml(TEXT)
	},

	/**
        * Creates a banner
        * @param {string} text - the banner text
        * @param {string} size - the banner size
        * @return the banner
    */
	banner(text, size){
		return bannerIpml(text, size)
	}
}
