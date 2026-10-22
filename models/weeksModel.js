
const mongoose = require('mongoose')

// Define the content fields stored for each pregnancy-week record.
const weeksSchema = new mongoose.Schema({
    // Identify the pregnancy week and the associated baby-size description.
    weekNumber:String,
    babySize:String,

    // Store descriptions of maternal changes, symptoms, and the baby's development.
    WhappenInBody:String,
    sympotyms:String,
    babyLooks:String,

    // Store the two additional informational options shown for the week.
    option1:String,
    option2:String,
})

// Register the schema as the model used to query the Weeks collection.
const weeksModel = mongoose.model("Weeks" , weeksSchema)

module.exports = weeksModel;