// routes/user.routes.js
import { Router } from "express";

import { 
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory   
} from "../controllers/user.controller.js";

import {
    verifyJWT,
} from "../middleware/auth.middleware.js";

import {
    upload,
} from "../middleware/multer.middleware.js";



const router = Router();

router.route("/register").post(
    upload.fields([
        {name: "avatar", maxCount: 1},
        {name: "coverImage", maxCount:1}
    ]),
    
    registerUser);


router.route("/login").post(loginUser);

// secured routes

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT,upload.single("/avatar"), updateAvatar)
router.route("/cover-Image-upload").patch(verifyJWT,upload.single("/coverImage"),updateCoverImage)

// if u are using params then
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)


export default router;
