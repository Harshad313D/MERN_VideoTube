import dotenv from 'dotenv';
import { app } from './app.js'; // Import the app instance
import connectDB from './db/indexDB.js';

// Configure dotenv to read environment variables
dotenv.config();

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start the server after successful DB connection
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed!!", err);
  });









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