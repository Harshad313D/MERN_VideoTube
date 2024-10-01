
import {asyncHandler} from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";




export const verifyJWT = asyncHandler(async (req, _ , next) => {
    try{
        const token = req.cookies?.accessToken || req.header
    ("Authorization")?.replace("Bearer", "")

    if(!token){
        throw new Error("Unauthorized request")
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if(!user){
        throw new Error("Invalid Access Token")
    }

    req.user = user
    next()
    } catch(error){
        throw new ApiError(401, errror?.message || "Invalid ACEESS TOKEN")
    }


})