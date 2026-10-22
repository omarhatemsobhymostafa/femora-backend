
const weeksModel = require('../models/weeksModel');

// Fetch all week documents and return them as JSON.
const getAllWeeks =  async (req , res)=>{
    const weeksData = await weeksModel.find().lean();
    res.json(weeksData)
}

// Find one week using the number supplied in the URL.
const getWeekByNumber = async (req , res) =>{
    const weekNumber = req.params.weekNumber;
    const weekData = await weeksModel.findOne({weekNumber: weekNumber}).lean();
    res.json(weekData)
}

// Edit a Week document using the number supplied in the URL and the data supplied in the request body.
const editWeekByNumber = async (req , res) =>{
    const weekNumber = req.params.weekNumber;
    const updatedData = req.body;
    const updatedWeek = await weeksModel.findOneAndUpdate({weekNumber: weekNumber}, updatedData, {new: true}).lean();
    res.json(updatedWeek)
} 

// Export handlers so the router can attach them to endpoints.
module.exports = {
    getAllWeeks,
    getWeekByNumber,
    editWeekByNumber
}

