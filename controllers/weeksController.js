
const weeksModel = require('../models/weeksModel');

// Fetch all week documents and return the plain records as JSON.
const getAllWeeks =  async (req , res)=>{
    // Use lean results because this endpoint only reads and returns the documents.
    const weeksData = await weeksModel.find().lean();
    res.json(weeksData)
}

// Find one week using the number supplied in the URL.
const getWeekByNumber = async (req , res) =>{
    // Read the route parameter and query the matching week record.
    const weekNumber = req.params.weekNumber;
    const weekData = await weeksModel.findOne({weekNumber: weekNumber}).lean();
    res.json(weekData)
}

// Edit a week using its URL number and the submitted request body.
const editWeekByNumber = async (req , res) =>{
    // Gather the lookup key and update fields from the incoming request.
    const weekNumber = req.params.weekNumber;
    const updatedData = req.body;

    // Return the updated record as a plain object rather than a Mongoose document.
    const updatedWeek = await weeksModel.findOneAndUpdate({weekNumber: weekNumber}, updatedData, {new: true}).lean();
    res.json(updatedWeek)
} 

// Export handlers so the router can attach them to API endpoints.
module.exports = {
    getAllWeeks,
    getWeekByNumber,
    editWeekByNumber
}
