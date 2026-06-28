/*
 * Handover note: MongoDB connection helper.
 * server.js calls connectDB() once on startup; this file reads MONGO_URI from .env
 * and establishes the shared Mongoose connection used by every model and route.
 */
// const mongoose = require("mongoose")
import mongoose from "mongoose"
import logger from "../utils/logger.js"

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        logger.info("MongoDB Connected Successfully :)")
    }
    catch(error) {
        logger.error(`MongoDB Connection Error: ${error.message}`, { error })
        process.exit(1)
    }
}

// module.exports = connectDB;
export default connectDB;