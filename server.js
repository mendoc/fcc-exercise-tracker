const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const userSchema = new mongoose.Schema({
    username: String
})

const exerciseSchema = new mongoose.Schema({
    userId: String,
    date: String,
    duration: Number,
    description: String
})

const userModel = mongoose.model('User', userSchema)
const exerciseModel = mongoose.model('Exercise', exerciseSchema)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', (req, res) => {
    let users = []
    userModel.find({}, '_id username', (err, data) => {
        data.forEach(user => {
            users.push(user)
        })
        res.json(users)
    })
});

app.get('/api/exercise/log', (req, res) => {
    let userId   = req.query.userId
    let dateFrom = req.query.from
    let dateTo   = req.query.to
    let limit    = parseInt(req.query.limit)

    if (!userId) res.json({error: 'Please specify an user ID'})

    userModel.findById(userId, '_id username', (err, user) => {
        if (err) res.json({error: 'User not found'})

        let query = exerciseModel.find({userId: user._id})
        query.select('description date duration')
        if (limit > 0) query.limit(limit)
        if (dateFrom) query.gte('date', Date.parse(dateFrom))
        if (dateTo) query.lte('date', Date.parse(dateTo))

        query.exec((err, data) => {
            if (err) {
                console.log(err)
                res.json({error: 'Cannot get exercises'})
            }
            let exercises = []
            if (data.length > 0) {
                data.forEach(exercise => {
                    exercises.push({
                        description: exercise.description,
                        duration: exercise.duration,
                        date: new Date(parseInt(exercise.date)).toDateString()
                    })
                })
            }
            const output = {
                _id: user._id,
                username: user.username,
                count: exercises.length,
                log: exercises
            }
            console.log(output)
            res.json(output)
        })
        
    })
});

app.post('/api/exercise/new-user', (req, res) => {
    let username = req.body.username;

    let user = new userModel({
        username: username
    })

    user.save((err, data) => {
        res.json({ username: data.username, _id: data._id })
    })
});

app.post('/api/exercise/add', (req, res) => {
    let userId = req.body.userId;
    let description = req.body.description;
    let duration = req.body.duration;
    let date = null

    if (req.body.date) date = Date.parse(req.body.date)
    else date = Date.now()

    userModel.findById(userId, (err, user) => {

        if (err) res.json({error: 'User not found'})

        let exercise = new exerciseModel({
            userId: userId,
            description: description,
            duration: duration,
            date: date
        })

        exercise.save((err, data) => {
            res.json({ 
                _id: user._id,
                username: user.username, 
                description: data.description,
                duration: data.duration,
                date: new Date(parseInt(data.date)).toDateString(),
            })
        })
    })

    
});





const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
