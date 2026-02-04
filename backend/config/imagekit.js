const ImageKit = require('@imagekit/nodejs');

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_8W6FmUNZF3MJkqcKr7C3untNFRk=',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/utwr84eaa'
});

module.exports = imagekit;
