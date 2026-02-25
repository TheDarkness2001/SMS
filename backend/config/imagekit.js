const ImageKit = require('@imagekit/nodejs');
const FormData = require('form-data');

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
        // Use multipart/form-data for file upload
        try {
          const authString = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');
          
          // Create FormData for multipart upload
          const formData = new FormData();
          
          // Convert base64 to buffer
          const base64Data = options.file;
          const fileBuffer = Buffer.from(base64Data, 'base64');
          
          formData.append('file', fileBuffer, options.fileName);
          formData.append('fileName', options.fileName);
          
          if (options.folder) {
            formData.append('folder', options.folder);
          }
          
          if (options.useUniqueFileName !== undefined) {
            formData.append('useUniqueFileName', options.useUniqueFileName.toString());
          }
          
          console.log('[ImageKit Upload] Uploading to:', 'https://upload.imagekit.io/api/v1/files/upload');
          
          const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
            },
            body: formData
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ImageKit upload failed: ${response.status} ${errorText}`);
          }
          
          const result = await response.json();
          console.log('[ImageKit Upload] Success:', result.url);
          return result;
        } catch (error) {
          console.error('[ImageKit] Upload method error:', error);
          throw error;
        }
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
