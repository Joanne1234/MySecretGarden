const express = require("express")
const router = express.Router();
const {verify} = require("./verify");
const ReflectionEntry = require("../models/ReflectionEntry");
const User = require("../models/User");
const functions = require('./helper');
const Mood = require("../models/Mood");
const { getReflectionInfo } = require("./helper");
const myValidSchemas = require("../validation");

// On reflection page
router.get("/",  verify, async (req, res) => {
    // get all reflection entries
    try {
        const currentUser = await User.findOne({ _id: req.user._id });
        const reflections = currentUser.reflectionEntries
        res.json(getAllReflectionInfo(reflections, currentUser.mood));
    } catch(err) {
        res.json({message: err});
    }
});

// looking at a specific reflection entry
router.get('/:reflectionId', verify, async (req, res) => {
    try {
        const currentUser = await User.findOne({ _id: req.user._id });
        const reflections = currentUser.reflectionEntries
        const specificReflection = functions.getObject(req.params.reflectionId, reflections)
        res.json(getReflectionInfo(specificReflection, currentUser.mood));
    } catch (err) {
        res.json({message: err});
    }
});


// add new reflection entry
router.post("/", verify, async (req, res) => {
    // basic field validation
    const { error } = myValidSchemas.ReflectionValidation.validate(req.body.post);
    if (error) return res.status(400).send({msg: error.details[0].message});
    
    try {
        console.log("finding user:", req.user._id)
        const currentUser = await User.findOne({ _id: req.user._id });
        console.log(currentUser)
        // create new reflection entry
        const moodBefore = new Mood({
            scale: req.body.post.moodBefore,
            comments: req.body.post.commentsBefore,
            parent: {
                reflection: true
            }
        })
        const moodDuring = new Mood({
            scale: req.body.post.moodDuring,
            comments: req.body.post.commentsDuring,
            parent: {
                reflection: true
            }
        })
        const moodAfter = new Mood({
            scale: req.body.post.moodAfter,
            comments: req.body.post.commentsAfter,
            parent: {
                reflection: true
            }
        })
        const newReflection = new ReflectionEntry({
            event: req.body.post.event,
            description: req.body.post.description,
            feelings: {
                before: moodBefore._id,
                during: moodDuring._id,
                after: moodAfter._id
            },
            learnt: req.body.post.learnt
        });
        // update parent value of all moods
        moodBefore.parent.id = newReflection._id
        moodDuring.parent.id = newReflection._id
        moodAfter.parent.id = newReflection._id

        // extra points if more detailed reflection is provided 
        if (req.body.post.extended === true) {
            newReflection.evaluation = true
            newReflection.evaluation = req.body.post.evaluation
            newReflection.actions = req.body.post.actions
            newReflection.conclusion = req.body.post.conclusion
            newReflection.actionPlan = req.body.post.actionPlan
            newReflection.points = newReflection.points*2
        }
        console.log(newReflection)
        // save new reflection to database
        currentUser.reflectionEntries.push(newReflection)
        currentUser.mood.push(moodBefore)
        currentUser.mood.push(moodDuring)
        currentUser.mood.push(moodAfter)
        currentUser.save()
        console.log(currentUser)
        res.json(getReflectionInfo(newReflection, currentUser.mood));
    } catch(err) {
        res.json({message: err});
    }
});

// delete reflection
router.delete('/:reflectionId', verify, async (req, res) => {
    try{
        const currentUser = await User.findOne({ _id: req.user._id });
        const reflections = currentUser.reflectionEntries
        // find reflection and remove from list of reflections
        const specificReflection = functions.getObject(req.params.reflectionId, reflections)
        reflections.pull(specificReflection)
        const moods = currentUser.mood
        const reflMoods = specificReflection.feelings
        // get Mood object of each mood
        const moodBefore = functions.getObject(reflMoods.before, moods)
        const moodDuring = functions.getObject(reflMoods.during, moods)
        const moodAfter = functions.getObject(reflMoods.after, moods)
        const reflMoodsObject = [moodBefore, moodDuring, moodAfter]
        // remove moods from the list
        moods.pull(moodBefore)
        moods.pull(moodDuring)
        moods.pull(moodAfter)
        // add points to deleted
        currentUser.deletedPoints += specificReflection.points
        currentUser.deletedPoints += functions.getPoints(reflMoodsObject)
        currentUser.save()
        res.json(getAllReflectionInfo(reflections, moods));
    } catch(err) {
        res.json({message: err});
    }
})

// update reflection
router.patch('/:reflectionId', verify, async (req, res) => {
    // basic field validation
    const { error } = myValidSchemas.ReflectionValidation.validate(req.body.post);
    if (error) return res.status(400).send({msg: error.details[0].message});
    
    try {
        const currentUser = await User.findOne({ _id: req.user._id });
        const reflections = currentUser.reflectionEntries
        const specificReflection = functions.getObject(req.params.reflectionId, reflections)
        const moods = currentUser.mood
        console.log(specificReflection)
        if (specificReflection === null) {
            res.json("Reflection Entry not found")
        } 
        // update information
        if (req.body.post) {
            const reflMoods = specificReflection.feelings
            specificReflection.event = req.body.post.event
            specificReflection.description = req.body.post.description
            // get Mood Objects
            const moodBefore = functions.getObject(reflMoods.before, moods)
            const moodDuring = functions.getObject(reflMoods.during, moods)
            const moodAfter = functions.getObject(reflMoods.after, moods)
            // update Moods
            moodBefore.scale = req.body.post.moodBefore
            moodDuring.scale = req.body.post.moodDuring
            moodAfter.scale = req.body.post.moodAfter
            moodBefore.comments = req.body.post.commentsBefore
            moodBefore.comments = req.body.post.commentsDuring
            moodBefore.comments = req.body.post.commentsAfter
            specificReflection.learnt = req.body.post.learnt
            // extra points if more detailed reflection is provided 
            if (req.body.post.extended) {
                specificReflection.evaluation = req.body.post.evaluation
                specificReflection.actions = req.body.post.actions
                specificReflection.conclusion = req.body.post.conclusion
                specificReflection.actionPlan = req.body.post.actionPlan
                if (specificReflection.extended == false) {
                    specificReflection.extended = true
                    specificReflection.points = 2*specificReflection.points
                }
            }
        }
        console.log(specificReflection)
        currentUser.save()
        res.json(getReflectionInfo(specificReflection, currentUser.mood));
    } catch(err) {
        res.json({message: err});
    }
});

function getAllReflectionInfo(reflections, moods) {
    var reflectionsInfo = []
    for (r in reflections) {
        const reflectionInfo = getReflectionInfo(reflections[r], moods)
        reflectionsInfo.push(reflectionInfo)
    }
    return reflectionsInfo
}


module.exports = router;
