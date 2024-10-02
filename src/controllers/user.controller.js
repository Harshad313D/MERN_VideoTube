import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


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

// const refreshAccessToken = asyncHandler(async (req, res)=>{
//     const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

//     if(!incomingRefreshToken){
//         throw new ApiError(401,"unauthorized request"); 
//     }

//     try{
//         const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)


//     const user = await User.findById(decodedToken?._id)
       
//     if(!user){
//         throw new ApiError(401,"Invalid refresh token"); 
//     }

//     if (incomingRefreshToken !== user?.refreshToken ){
//         throw new ApiError(401,"Refresh token is expired or used");
//     }

//     const opttions = {
//         httpOnly: true,
//         secure : true
//     }
//     const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

//     return res 
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", newRefreshToken, options)
//     .json(
//         new ApiResponse(200,{accessToken, refreshToken: newRefreshToken},
//             "Access token refreshed "
//         )
//     )

//     }catch(error){
//         throw new ApiError("invalid refresh token", 401)
//     }

// }
// )

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    console.log('Incoming Refresh Token:', incomingRefreshToken); // Log the incoming token

    if (!incomingRefreshToken) {
        console.log("No refresh token found.");
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log('Decoded Token:', decodedToken); // Log the decoded token

        const user = await User.findById(decodedToken?._id);
        console.log('User Found:', user); // Log found user

        if (!user) {
            console.log("User not found for this token.");
            throw new ApiError(401, "Invalid refresh token");
        }

        // Log the stored refresh token for comparison
        console.log('Stored Refresh Token:', user?.refreshToken);
        if (incomingRefreshToken !== user?.refreshToken) {
            console.log("Refresh token mismatch or expired.");
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true // Ensure you're using HTTPS if true
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"));

    } catch (error) {
        console.error('Error in refreshAccessToken:', error); // Log the error for debugging
        throw new ApiError("Invalid refresh token", 401);
    }
});


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

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))


})


// get cuurent user

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

// update account details
// const updateAccountDetails = asyncHandler(async (req, res)=>{
//     const {fullName, email} = req.body 
//     if(!fullName || !email){
//         throw new ApiError("Full Name and Email are required", 400)
//     }

//    const user = User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{fullName, email}
//         },
//         {new:true}
//     ).select("-password")

//     return res
//     .status(200)
//     .json(new ApiResponse(200, user, "Account Details updated "))

// })
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    
    // Validate input
    if (!fullName || !email) {
        throw new ApiError("Full Name and Email are required", 400);
    }

    // Update the user
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true } // Returns the updated document
    ).select("-password"); // Exclude password from the returned object

    // Check if user was found and updated
    if (!user) {
        throw new ApiError("User not found", 404); // Handle case where user doesn't exist
    }

    // Send the response
    return res.status(200).json(new ApiResponse(200, user, "Account Details updated"));
});


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

// get user channel profile

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params 
    if(!username?.trim()){
        throw new ApiError("Username is required", 400)
    }

   const channel = await User.aggregate([
    {
        $match:{username:username?.toLowerCase()},
    },
    {
        // in mongo name changes to lower case and becomes plural
        $lookup:{
            from: "subscriptions",
            localField : "_id",
            foreignField:"channel",
            as: "subscribers"
        }
        // to get subscribers 
    },
    {
        $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField:"subscriber",
            as: "subscribedTo"
        }
        // to get subscribed channels
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            subscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed : {
                $cond:{
                    if:{$in:[req.user?._d, "$subscribers.subscriber"]},
                    then:true,
                    else:true
                }
            },

        }
    },
    
    {
        $project:{
            _id: 1,
            username: 1,
            fullName: 1,
            email: 1,
            avatar: 1,
            coverImage: 1,
            subscribersCount: 1,
            subscribedToCount: 1,
            isSubscribed: 1
        }
    }
   
])

    if(!channel?.length){
        throw new ApiError("Channel not found", 404)
    }

    return res
   .status(200)
   .json(new ApiResponse(200,channel[0],"User channel fetched !!"))

})

// get user watch history
// const getWatchHistory = asyncHandler(async(req,res)=>{
//     const user = await User.aggregate([
//         {
//             $match:{
//                 _id: new mongoose.Types.ObjectId(req.user._id)
//             }
//         },
//         {
//             $lookup:{
//                 from: "videos",
//                 localField: "watchHistory",
//                 foreignField:"_id",
//                 as: "watchHistory",
//                 pipeline: [
//                     {
//                         $lookup:{
//                             from:"users",
//                             localField: "owner",
//                             foreignField:"_id",
//                             as: "owner",
//                             pipeline:[
//                                 {
//                                     $project:{
//                                         username: 1,
//                                         fullName: 1,
//                                         avatar: 1
//                                     }
//                                 }]
//                         }
//                     },
//                     {
//                         $addFields:{
//                             owner:{
//                                 $first:"$owner",
//                             }
//                         }
//                     }

//                 ]
//             }
//         },
//         {

//         }

//     ])

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(
//             200,
//             user[0]?.watchHistory || [],
//             "User watch history fetched successfully"
//         )
//     )
// })
const getWatchHistory = asyncHandler(async (req, res) => {
    // Check if the user ID is valid
    if (!req.user?._id) {
        throw new ApiError(400, "User ID is required");
    }

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id), // Use the user ID directly
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                        },
                    },
                    // You might want to add other stages like sorting or filtering here
                ],
            },
        },
    ]);

    // Check if user watch history exists
    if (!user.length || !user[0]?.watchHistory) {
        return res.status(200).json(
            new ApiResponse(200, [], "No watch history found")
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "User watch history fetched successfully"
        )
    );
});



export { 
    registerUser, loginUser, logoutUser,
    refreshAccessToken, getCurrentUser,
    changeCurrentPassword,updateAccountDetails,
    updateAvatar, updateCoverImage,
    getUserChannelProfile, getWatchHistory};

