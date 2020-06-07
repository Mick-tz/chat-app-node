const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMsg } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT
const app = express()
const server = http.createServer(app)
const io = socketio(server)

const publicDirPath =  path.join(__dirname, '../public')
app.use(express.static(publicDirPath))


// listener for connections on port
io.on('connection', (socket) => {
    console.log('New socket connection!')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error) {
            return callback(error)
        }


        socket.join(user.room)

        // emits welcome message to newly instantiated sockets
        socket.emit('message', generateMessage("Admin",'Welcome!'))
        // broadcast a new user warning to all previously existing sockets
        socket.broadcast.to(user.room).emit('message', generateMessage("Admin", `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // listener to socket sending messages
    socket.on('sendMessage', (message, callback) => { //callback is used for acknowledgements
        const filter = new Filter() //instance of bad-words program

        // handles swering
        if (filter.isProfane(message)) {
            return callback('No digas groserías hijo de tu puta madre')
        }

        const user = getUser(socket.id)

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message',generateMessage("Admin",`${user.username} has left the room!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback()
    })
})

server.listen(port, () => {
    console.log(`server is up on port ${port}!`)
})