
require('dotenv').config();
// console.log(process.env.HARPERDB_URL);
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const {Server} = require('socket.io')


const server = http.createServer(app);
// const io = require('socket.io')(http);

const CHAT_BOT = 'ChatBot';
let chatRoom = '';
let allUsers = [];

const harperSaveMessage = require('./services/harper-save-message');
const harperGetMessages = require('./services/harper-get-messages');
const leaveRoom = require('./utils/leave-room');

const io = new Server(server,{
    cors:{
        // origin:'http://localhost:3000',
        origin:'https://reactjs-socket-io.vercel.app',
        methods:['GET','POST'],
    }
})

io.on('connection',(socket)=>{
    console.log(`User connected ${socket.id}`   )

    socket.on('join_room',data=>{
        const {username, room} = data;
        socket.join(room);
        // console.log(room)

        harperGetMessages(room)
        .then((last100Messages)=>{
            // console.log(last100Messages)
            socket.emit('last_100_messages',last100Messages)
        })
        .catch((err) => console.log(err));
        
        let __createdtime__ = Date.now();

        socket.to(room).emit('receive_message',{
            message: `${username} has joined the chat room`,
            username: CHAT_BOT,
            __createdtime__,
        })

        socket.emit('receive_message',{
            message:`Welcome ${username}`,
            username: CHAT_BOT,
            __createdtime__,
        })

        socket.on('send-message',(data)=>{
            const {message,username,room, __createdtime__}  = data;
            io.in(room).emit('receive_message',data)
        
            harperSaveMessage(message, username, room, __createdtime__) // Save message in db
            .then((response) => console.log(response))
            .catch((err) => console.log(err));
        })

        chatRoom = room;
        allUsers.push({id: socket.id, username, room});
        chatRoomUsers = allUsers.filter((user)=> user.room === room)
        socket.to(room).emit('chatroom_users',chatRoomUsers)
        socket.emit('chatroom_users',chatRoomUsers)

        socket.on('leave_room',(data)=>{
            console.log('user left!!!')
            const {username,room} = data;
            socket.leave(room);
            const __createdtime__ = Date.now();

            allUsers = leaveRoom(socket.id, allUsers)
            socket.to(room).emit('chatroom_users',allUsers);
            socket.to(room).emit('receive_message',{
                username: CHAT_BOT,
                message: `${username} has left the chat`,
                __createdtime__,
            })
        })



    })
})






app.get('/',(req,res)=>{
    res.send('<h1 style="text-align:center">socket.io nodejs backend </h1>')
})

server.listen(4000,()=> 'Server is running on port 4000');
// io.listen(4000,()=> 'Server is running on port 4000');
