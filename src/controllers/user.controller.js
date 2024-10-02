import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user = await User.findByIdAndUpdate(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch(e){
        throw new ApiError("Error occurred while generating tokens", 500)
    }
}

const registerUser = asyncHandler(async (req, res) => {
    
// get user data
// validation
// checf if already exits
// check for all required file images and avatar
// uplaod files on cloudinary
// create user object- entry in db
// remove password and refresh token from from response
// check for user creatation
// return response
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

const loginUser = asyncHandler(async (req, res) => {
// get data from req.body
// username or email
// password check
// access token refresh token
// send cockie

const {email, username, password} = req.body

if (!username && !password) {
    throw new ApiError("Username and Password are required", 400);
}
const user = await User.findOne({
    $or :[{email}, {username}]
})

if (!user ) {
    throw new ApiError("user does not exitst ", 404);
}

const isPasswordValid = await user.isPasswordCorrect(password)
if (!isPasswordValid) {
    throw new ApiError("Invalid user credentials", 401);
}


const {accessToken, refreshToken }= await generateAccessAndRefreshTokens(user._id)

const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

const options = {
    httpOnly: true,
    secure : true
}

return res
.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(
        200,
        {
        user: loggedInUser, accessToken,refreshToken
        },
        "User logged in successfully"
    )
)


});

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{refreshToken: 1 }
        },
        {   new: true

        }
    )
    const options = {
    httpOnly: true,
    secure : true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User logged out successfully")

    )
});

//  endpoint for getting refresh token

const refreshAccessToken = asyncHandler(async (req, res)=>{
    const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request"); 
    }

    try{
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)


    const user = await User.findById(decodedToken?._id)
       
    if(!user){
        throw new ApiError(401,"Invalid refresh token"); 
    }

    if (incomingRefreshToken !== user?.refreshToken ){
        throw new ApiError(401,"Refresh token is expired or used");
    }

    const opttions = {
        httpOnly: true,
        secure : true
    }
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    return res 
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(200,{accessToken, refreshToken: newRefreshToken},
            "Access token refreshed "
        )
    )

    }catch(error){
        throw new ApiError("invalid refresh token", 401)
    }

}
)

// change password


const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse("Password changed successfully"))


})


// get cuurent user

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

// update account details
const updateAccountDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} = req.body 
    if(!fullName || !email){
        throw new ApiError("Full Name and Email are required", 400)
    }

   const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{fullName, email}
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated "))

})

// update files

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) { 
        throw new ApiError("Avatar file is missing", 400);
    }

    const avatar = await uploadOnCloudinary
    (avatarLocalPath)

    if(!avatar.url){
        throw new ApiError("Error uploading avatar", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{avatar: avatar.url}
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated"))

})

// update CoverImage

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError("Cover Image file is missing", 400);
    }
    const coverImage = await uploadOnCloudinary
    (coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError("Error uploading cover image", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{coverImage: coverImage.url}
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated"))
})


export { 
    registerUser, loginUser, logoutUser,
    refreshAccessToken, getCurrentUser,
    changeCurrentPassword,updateAccountDetails,
    updateAvatar, updateCoverImage };

