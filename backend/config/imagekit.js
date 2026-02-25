const ImageKit = require('@imagekit/nodejs');
const axios = require('axios');
const FormData = require('form-data');

// Initialize ImageKit only if private key exists
let imagekit = null;

if (process.env.IMAGEKIT_PRIVATE_KEY) {
  try {
    // ImageKit SDK v7+ initialization  
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_8W6FmUNZF3MJkqcKr7C3untNFRk=',
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/utwr84eaa'
    });
    
    // Add custom upload method using axios
    imagekit.upload = async function(options) {
      try {
        const formData = new FormData();
        formData.append('file', options.file, options.fileName);
        formData.append('fileName', options.fileName);
        
        if (options.folder) {
          formData.append('folder', options.folder);
        }
        
        if (options.useUniqueFileName !== undefined) {
          formData.append('useUniqueFileName', options.useUniqueFileName.toString());
        }
        
        const authString = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');
        
        console.log('[ImageKit Upload] Uploading via axios...');
        
        const response = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Basic ${authString}`,
          },
        });
        
        console.log('[ImageKit Upload] Success:', response.data.url);
        return response.data;
      } catch (error) {
        console.error('[ImageKit] Upload error:', error.response?.data || error.message);
        throw error;
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
