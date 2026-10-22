
const mongoose = require('mongoose')

// Define the fields stored for each pregnancy week.
const weeksSchema = new mongoose.Schema({
    weekNumber:String,
    babySize:String,
    WhappenInBody:String,
    sympotyms:String,
    babyLooks:String,
    option1:String,
    option2:String,
})

// Create the Mongoose model used to query the Weeks collection.
const weeksModel = mongoose.model("Weeks" , weeksSchema)

module.exports = weeksModel;