const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback())
const io = require('socket.io')(server);
const port = 3000
const moment = require('moment')

var players = [] // 存储玩家下棋数据
var users = [] // 存储在线用户
var joinGamePlayers = [] // 存储加入游戏的玩家id 用户名, 玩家棋子颜色
const COLOR = ['black', 'white']
var colorIndex = 0
var selectedColor = []


server.listen(port, () => {
    console.log(`app run at : http://localhost:${port}`)
})

io.on('connect', socket => {
    console.log('有新的客户端连接');

    socket.on('connectUsers', data => {
        
        let userIndex = users.findIndex(item => item.id === data.id)
        if (userIndex !== -1){
            users.splice(userIndex, 1, data)
        } else {
            users.push(data)
        }
        users = users.filter(item => !!item.id)
        
        let playerIndex = joinGamePlayers.findIndex(v => data.id === v.id)
        // 如果是正在游戏的玩家
        if (playerIndex !== -1) {
            let obj = data
            joinGamePlayers.splice(playerIndex, 1, { ...joinGamePlayers[playerIndex], ...obj })
            obj = players[players.length - 1]
            io.emit('getPlayers', data);
        }
        io.emit('getJoinGameUsers', joinGamePlayers);
        io.emit('getSelectColor', selectedColor)
        io.emit('getUsers', users);
    })

    socket.on('connectPlayers', data => {
        if (!data.currentPlayer) {
            data.currentPlayer = COLOR[colorIndex]
            colorIndex++
        }

        // 清空棋盘
        if (data.isReset) {
            players = players.map(item => {
                return data
            })
            selectedColor = []
            io.emit('getSelectColor', selectedColor)
            return io.emit('getPlayers', data);
        }
        // 用户刷新页面
        if (data.piecePoints && data.piecePoints.length === 0) {
            data = players.length > 0 && players.find(v => v.piecePoints.length > 0) || data
            return io.emit('getPlayers', data);
        }
        playerIndex = players.findIndex(item => item.id === data.id)
        if (playerIndex !== -1){
            players.splice(playerIndex, 1, data)
        } else if (players.length < 3) {
            players.push(data)
        }
        
        players.forEach(item => item.currentPlayer === data.currentPlayer)

        socket.broadcast.emit('getPlayers', data);
    })
    // 胜利
    socket.on('victory', data => {
        io.emit('getVictory', data);
    })

    // 选择颜色
    socket.on('selectColor', data=> {
        if (selectedColor.length < 2) {
            selectedColor.push(data)
        }
        io.emit('getSelectColor', selectedColor)
    })
    // 玩家加入游戏，客户端判断是否加入，未加入则不允许操作棋盘
    socket.on('joinGame', data => {
        if (joinGamePlayers.length < 2) {
            if(!joinGamePlayers.find(item => item.id === data.id)) {
                joinGamePlayers.push(data)
            }
        }
        notice(getMsg(`${data.playerName}加入了游戏`))
        io.emit('getJoinGameUsers', joinGamePlayers);
    })

    socket.on('leaveGame', data => {
        // 清空所有数据
        players = []
        let playerIndex = joinGamePlayers.findIndex(v => v.id === data.id)
        let p = joinGamePlayers[playerIndex]
        let colorIdx = selectedColor.findIndex(v => v === data.pieceColor)
        selectedColor.splice(colorIdx, 1)
        joinGamePlayers.splice(playerIndex, 1)

        io.emit('getSelectColor', selectedColor)
        io.emit('getPlayers', null);
        io.emit('getJoinGameUsers', joinGamePlayers);
        notice(getMsg(`${data.playerName}离开了游戏`))
    })


    function notice(msg) {
        io.emit('getNotice', msg)
    }

    socket.on('send', data => {
        console.log('客户端发送的内容：', data);
        socket.emit('getMsg', '我是返回的消息... ...');
    })
    // 客户端断开连接
    socket.on('leave', data => {
        let userIndex = users.findIndex(v => v.id === data.id)
        if (userIndex !== -1) {
            users.splice(userIndex, 1)
        }
        io.emit('getJoinGameUsers', joinGamePlayers);
        io.emit('getSelectColor', selectedColor)
        io.emit('getUsers', users);
    })
    socket.on('disconnect', data => {
        console.log('客户端断开连接：', data);
    })
    setTimeout(() => {
        socket.emit('getMsg', '我是初始化3s后的返回消息... ...')
    }, 3000)
})

// 获取当前玩家
function getMsg(msg) {
    return {
        time: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),
        msg
    }
}