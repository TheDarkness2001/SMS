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
        // Bypass SDK and use direct fetch to ImageKit upload API
        try {
          const authString = Buffer.from(`${ImageKitInstance.options.privateKey}:`).toString('base64');
          
          const uploadData = {
            file: options.file,
            fileName: options.fileName,
          };
          
          if (options.folder) {
            uploadData.folder = options.folder;
          }
          
          if (options.useUniqueFileName !== undefined) {
            uploadData.useUniqueFileName = options.useUniqueFileName;
          }
          
          console.log('[ImageKit Upload] Uploading to:', 'https://upload.imagekit.io/api/v1/files/upload');
          
          const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authString}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadData)
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
