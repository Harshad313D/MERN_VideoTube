import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/apiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    

    const {fullName, email, username, password} = req.body
    console.log("email: ", email)

    // if (fullName === ""){
    //     throw new ApiError("Full Name is required", 400)
    // }
    // // can use like this for all fields

    if ([fullName, email, username, password].some((field)=>
        field?.trim() === "")
    ) {
        throw new ApiError("All fields are required", 400)
    }
    // 

    const existedUser =await User.findOne({
        $or :[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409, "Username or Email already exists")
    }

    // 
    console.log(req.files);


    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError( 400, "Avatar is required")
    }

    // uploadon cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // ||!coverImage
    if(!avatar ){
        throw new ApiError( 500, "Error uploading files to cloudinary")
    }

    // db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken "
    )

    if(!createdUser){
        throw new ApiError(500, "somthing went wrong while creating user")
    }

    // return repsonse
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})

export { registerUser };

// get user data
// validation
// checf if already exits
// check for all required file images and avatar
// uplaod files on cloudinary
// create user object- entry in db
// remove password and refresh token from from response
// check for user creatation
// return response