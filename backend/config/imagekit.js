const ImageKit = require('@imagekit/nodejs');

// Initialize ImageKit only if private key exists
let imagekit = null;

if (process.env.IMAGEKIT_PRIVATE_KEY) {
  try {
    // ImageKit SDK v7+ initialization  
    const ImageKitInstance = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_8W6FmUNZF3MJkqcKr7C3untNFRk=',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/utwr84eaa'
    });
    
    // Create wrapper object with upload method
    imagekit = {
      ...ImageKitInstance,
      upload: async function(options) {
        // Use the SDK's request method to upload
        const response = await ImageKitInstance.request({
          method: 'POST',
          url: '/v1/files/upload',
          data: options
        });
        return response;
      }
    };
    
    console.log('[ImageKit Config] ImageKit SDK initialized successfully');
    console.log('[ImageKit Config] Has upload method?', typeof imagekit.upload);
  } catch (error) {
    console.error('[ImageKit Config] Failed to initialize ImageKit:', error.message);
  }
} else {
  console.log('[ImageKit Config] IMAGEKIT_PRIVATE_KEY not found, ImageKit disabled');
}

module.exports = imagekit;
