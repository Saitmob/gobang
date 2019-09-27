import { setUser, getUser } from 'utils/index'
import io from 'socket.io-client'
const socket = io('http://localhost:3000')

window.addEventListener("beforeunload",() =>{
    socket.emit('leave', getUser())
})

export default {
    methods: {
        changeNameHandle() {
            let user = getUser()
            user.playerName = this.playerName || user.playerName
            setUser(user)
            socket.emit('connectUsers', user)
        },
        getUserInfo() {
            return getUser()
        },
        initSocket() {
            socket.on('connect', () => {
                console.log('客户端已连接服务器')

                this.changeNameHandle()

                // 获取在线用户
                socket.on('getUsers', data => {
                    this.users = data
                    this.playerName = getUser().playerName
                })
                // 获取在线玩家 非数组
                socket.on('getPlayers', data => {
                    this.setPlayer(data)
                })
                // 获取加入游戏的玩家
                socket.on('getJoinGameUsers', data => {
                    this.currentPlayersInfo = data
                    this.cantJoinGame = data.length === 2

                    let hasMe = data.find(item => item.id === getUser().id)
                    
                    if (hasMe && !this.pieceColor) {
                        this.pieceColor = hasMe.pieceColor
                        this.currentPlayer = this.pieceColor
                    }
                    this.cantLeaveGame = !hasMe
                    if (data.length === 2 && hasMe) {
                        // let player = this.getPlayer()
                        // socket.emit('connectPlayers', player)

                        this.addEvent()
                    }
                    this.playerInfo.blackPlayer = data.find(item => item.pieceColor === 'black')
                    this.playerInfo.whitePlayer = data.find(item => item.pieceColor === 'white')
                })

                socket.on('getVictory', (data) => {
                    this.victory(data)
                })
                // 公告
                socket.on('getNotice', (data) => {
                    this.notice.push(data)
                })
                socket.on('getMsg', (data) => {
                    console.log('服务器发送的消息：', data)
                })

                // 获取已选择颜色
                socket.on('getSelectColor', data => {
                    this.selectedColor = data
                })
            });

            socket.on('disconnect', function() {});
        },
        putDown() {
            // socket.emit('putDown', this.getPlayer())
            let p = this.getPlayer()
            socket.emit('connectPlayers', p)
            this.removeEvent()
        },
        getPlayer() {
            let { playerName, piecePoints, whitePiecePoints, blackPiecePoints, currentPlayer } = this._data
            let user = getUser()
            let player = {
                ...user,
                playerName,
                piecePoints,
                whitePiecePoints,
                blackPiecePoints,
                currentPlayer: currentPlayer || this.pieceColor,
                pieceColor: this.pieceColor
            }
            return player
        },
        setPlayer(data) {

            if (!data) return
            let { piecePoints = [], whitePiecePoints = [], blackPiecePoints = [], currentPlayer } = data
            // this.playerName = playerName
            // debugger;
            if (!this.pieceColor) {
                this.pieceColor = currentPlayer
            } else if (this.pieceColor === currentPlayer) {
                this.addEvent()
            }
            // if (data.isReset) {
            //     this.removeEvent()
            // }
            this.whitePiecePoints = whitePiecePoints
            this.blackPiecePoints = blackPiecePoints

            if (piecePoints && piecePoints.length > 0) {
                if (piecePoints.length > 1 && this.piecePoints.length === 0) {
                    // 用户刷新了页面导致 this.piecePoints.length === 0 此时需要全部重新渲染
                    let canvas = this.$refs.canvas
                    if (!canvas) return
                    let ctx = canvas.getContext('2d')

                    whitePiecePoints.map(item => {
                        let { x, y } = item
                        this.paintPiecesListItem(x, y, 'white', ctx)
                    })
                    blackPiecePoints.map(item => {
                        let { x, y } = item
                        this.paintPiecesListItem(x, y, 'black', ctx)
                    })
                    // piecePoints.map(item => {
                    //     let { x, y } = item
                    //     this.renderPiece(x, y)
                    // })
                } else {
                    this.currentPlayer = currentPlayer === 'white' ? 'black' : 'white'
                    let { x, y } = piecePoints[piecePoints.length - 1]
                    this.renderPiece(x, y)
                }
                this.currentPlayer = currentPlayer
            } else {
                // this.pieceColor = ''
                this.clearCanvas()
            }

            this.piecePoints = piecePoints || this.piecePoints
        },
        openModal() {
            this.dialogVisible = true
        },
        joinGame() {

            if (!this.pieceColor) {
                return
            }
            this.currentPlayer = this.pieceColor
            this.handleClose()

            let user = getUser()
            user.pieceColor = this.pieceColor


            socket.emit('joinGame', user)
            socket.emit('selectColor', this.pieceColor)
        },
        victory(player) {
            
            this.$alert(`${player} 方获胜`, '', {
                confirmButtonText: '确定'
            });
            this.removeEvent()
        },
        sendVictory() {
            socket.emit('victory', this.pieceColor)
        },
        // 清空棋盘
        reset() {
            let p = this.getDefaultPlayer()
            p.isReset = true
            p.currentPlayer = 'black'
            socket.emit('connectPlayers', p)
        },
        getDefaultPlayer() {
            return {
                playerName: '',
                piecePoints: [],
                whitePiecePoints: [],
                blackPiecePoints: [],
                currentPlayer: '', // 当前可以动作的玩家
                pieceColor: ''
            }
        },
        addEvent() {
            let canvas = this.$refs.canvas
            if (!canvas) return
            this.removeEvent()
            canvas.addEventListener('click', this.canvasClickHandle)
            canvas.addEventListener('mousemove', this.canvasMouseMoveHandle)
        },
        removeEvent() {

            let canvas = this.$refs.canvas
            if (!canvas) return
            canvas.removeEventListener('click', this.canvasClickHandle)
            canvas.removeEventListener('mousemove', this.canvasMouseMoveHandle)
        },
        handleClose() {
            this.dialogVisible = false
        },
        paintPiecesListItem(x, y, type, ctx) {
            ctx.beginPath()
            ctx.arc(x, y, 20, 0, 2 * Math.PI)
            ctx.fillStyle = type

            ctx.fill()
            ctx.stroke()
        },
        // 离开游戏 清空棋盘
        leaveGame() {
            let p = this.getPlayer()
            socket.emit('leaveGame', p)
            this.removeEvent()
        }
    }
}