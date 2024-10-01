import {v2 as cloudinary} from "cloudinary"
import fs from "fs"



// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
    api_key: process.env.CLOUDINAR_API_KEY, 
    api_secret: process.env.CLOUDINAR_API_SECRET // Click 'View API Keys' above to copy your API secret
});
    

    const uploadOnCloudinary = async (localFilePath) => {
        try{
            if(!localFilePath) return null;
            const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type: 'auto'
            })
            // file uploaded successfully!! 
            console.log(`File uploaded successfully to Cloudinary`);
            fs.unlinkSync(localFilePath)
            return response;
        }catch(error){
            fs.unlinkSync(localFilePath)
            return null;
        }
    }    


export { uploadOnCloudinary} 

