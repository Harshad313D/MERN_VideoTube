import dotenv from 'dotenv';
import connectDB from './db/indexDB.js';


dotenv.config()

connectDB()











// ;( async ()=>{
//     try{
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error)=>{
//             console.log("ERROR",error );
//             throw error
//         })

//         app.listen(process.env.PORT,()=>{
//             console.log(`Server is running on port ${process.env.PORT}`);
//         })

//     }catch(error){
//         console.error("ERROR: ", error)
//         throw error
//     }
// })()