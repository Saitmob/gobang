<template>
  <div class="hello">
    
      <div class="container-box">
        <div class="notice list-box">
          <div>公告：</div>
          <div v-for="(item, index) in notice" :key="index">
            <p>{{item.time}}：{{item.msg || '暂无公告'}}</p>
          </div>
        </div>
      <div class="canvas-box" style="margin-bottom: 20px">
        <canvas ref="canvas" height="600" width="600" style="border: 1px #eae8e8 solid" disabled></canvas>
        <canvas ref="canvasBG" height="600" width="600" class="canvas-bg"></canvas>
      </div>
      <div class="user-list list-box">
          <div>当前在线用户：</div>
        <div v-for="item in users" :key="item.id">
          <div>{{item.playerName || '未命名'}}</div>
        </div>
      </div>
      </div>
      <div class="player-list">
        <div>黑方：{{playerInfo.blackPlayer && playerInfo.blackPlayer.playerName}}</div>
        <div>白方：{{playerInfo.whitePlayer && playerInfo.whitePlayer.playerName}}</div>
      </div>
    <div>
      玩家名：<el-input v-model="playerName" placeholder="请输入玩家名" style="width: 120px; margin-right:6px"/>
      <el-button @click="changeNameHandle">改名</el-button>
      <el-button @click="openModal" :disabled="cantJoinGame">加入游戏</el-button>
      <el-button @click="reset" :disabled="cantLeaveGame">清空棋盘</el-button>
      <el-button @click="leaveGame" :disabled="cantLeaveGame">退出游戏</el-button>
    </div>
    <el-dialog
      title="提示"
      :visible.sync="dialogVisible"
      width="30%"
      :before-close="handleClose">
      <div>
        选择颜色：
        <el-radio-group v-model="pieceColor">
          <el-radio label="black" :disabled="!!selectedColor.find(item => item === 'black')">黑</el-radio>
          <el-radio label="white" :disabled="!!selectedColor.find(item => item === 'white')">白</el-radio>
        </el-radio-group>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="handleClose">取 消</el-button>
        <el-button type="primary" @click="joinGame">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>

import { orderBy } from 'lodash'

import mixins from './mixin/index'

const HEIGHT = 50
const WIDTH = 50
const start_x = 50
const start_y = 50
const box_w = 500
const box_h = 500
const dash_box_wh = 40

var ctx = null
var lastPoint = null


export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  mixins: [mixins],
  data() {
    return {
      ...this.getDefaultPlayer(),
      users: [],
      currentPlayersInfo: [],
      cantJoinGame: false,
      cantLeaveGame: true,
      pieceColor: '', // 玩家当前棋子颜色
      dialogVisible: false,
      selectedColor: [],
      playerInfo: {
        blackPlayer: '',
        whitePlayer: ''
      },
      notice: []
    }
  },
  created() {
    
  },
  mounted(){
    this.$nextTick(()=>{
      let canvas = this.$refs.canvas
      this.initSocket()
      ctx = canvas.getContext ? canvas.getContext('2d') : {}
      this.paintGrid(box_w, box_h)
    })
  },
  methods: {
    clearCanvas() {
        ctx.clearRect(0, 0, 600, 600)
    },
    
    // 画背景
    paintGrid(boxWidth, boxHeight) {
      let canvas = this.$refs.canvasBG
      let ctx = canvas.getContext('2d')
      // 画竖线
      for(let i = 0; i <= boxWidth / WIDTH; i++) {
        let x = i * WIDTH + start_x
        let y0 = start_y
        let y1 = boxHeight + start_y
        // debugger;
        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
      }
      // 画横线
      for(let i = 0; i <= boxHeight / HEIGHT; i++) {
        let y = i * HEIGHT + start_y
        let x0 = start_x
        let x1 = boxHeight + start_x
        // debugger;
        ctx.moveTo(x0, y)
        ctx.lineTo(x1, y)
      }
      ctx.stroke();
    },
    paintBox(layerX, layerY, ctx){
      let wh = dash_box_wh
      // 计算中心点 使中心点吸附在格子的交叉点上 格子的半径为 25
      // y 轴临界点为 start_y + 25, start_y + 25 + 50, 即 25的倍数，吸附点为0，50，100，所以坐标不到25按0算，25-50却不到50按50算
      let x_bs = Math.round((layerX - start_x) / (WIDTH))
      let y_bs = Math.round((layerY - start_y) / (HEIGHT))
      let x = x_bs * WIDTH + start_x
      let y = y_bs * WIDTH + start_y
      // console.log('layerX', layerX, 'layerY', layerY)
      // console.log('x_bs', x_bs, 'y_bs', y_bs)
      x = x < 0 ? start_x : x
      y = y < 0 ? start_y : y
      // console.log('now',x, y)

      
      if (lastPoint) {
        let { x: lx, y: ly } = lastPoint
        // 如果已点击，则表示棋子已下，则不清空
        // 鼠标经过曾经下过的棋子，也不清空
        let lastPointHas = !!this.piecePoints.find(v => v.x === lx && v.y === ly)
        // console.log('lastPointHas', lastPointHas)
        // debugger;
        if (!lastPointHas) {
          this.clearSelectBox(lx, ly, wh)
        }
        // console.log('last', lx, ly)
      }
      
      lastPoint = {
        x,
        y
      }
      // 如果该点已经有棋子，则不作处理
      if(this.piecePoints.find(v => v.x === x && v.y === y)) {
        return
      }
      // 超出棋盘不绘制
      if (layerX < start_x || layerX > box_w + start_x || layerY < start_y || layerY > box_h + start_y) {
        return
      }
      

      this.paintDashSelect(x - wh / 2, y - wh / 2, ctx, wh)
      
    },
    // 鼠标所在点，x, y 为左上角坐标
    paintDashSelect(x, y, ctx, width) {
      let lineW = width / 3
      // 左上角折线
      // debugger;
      ctx.beginPath()
      ctx.moveTo(x, y + lineW)
      ctx.lineTo(x, y)
      ctx.lineTo(x + lineW, y)
      // 右上角折线
      ctx.moveTo(x + width, y + lineW)
      ctx.lineTo(x + width, y)
      ctx.lineTo(x + width - lineW, y)
      // 左下角
      ctx.moveTo(x, y + width - lineW)
      ctx.lineTo(x, y + width)
      ctx.lineTo(x + lineW, y + width)
      // 右下角
      ctx.moveTo(x + width, y + width - lineW)
      ctx.lineTo(x + width, y + width)
      ctx.lineTo(x + width - lineW, y + width)
      // TODO: 将此绘制缓存成图片，提高绘制性能
      ctx.stroke();
    },
    // 清空选择虚线框
    clearSelectBox(x, y, wh) {
      ctx.clearRect(x - wh / 2 - 2, y - wh / 2 - 2, wh + 3, wh + 3);
    },
    // 描绘棋子
    paintPiece(x, y, ctx) {
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, 2 * Math.PI)
      
      if (this.currentPlayer === 'black') {
        ctx.fillStyle = 'black'
        this.currentPlayer = 'white'
      } else {
        ctx.fillStyle = 'white'
        this.currentPlayer = 'black'
      }
      ctx.fill()
      ctx.stroke()
    },
    renderPiece(x, y) {
      lastPoint = { x, y }
      this.clearSelectBox(x, y, dash_box_wh)
      this.paintPiece(x, y, ctx)
    },
    // 计算胜利条件
    computeVictory(player) {
      // 有五个棋子相连则胜利
      
      let playerPoints = this[`${player}PiecePoints`]
      
      let yFalse = [] // x 轴方向未获胜数组
      let xFalse = []
      
      // debugger;

      // 斜向上
        // if (!yxFalse.find( item => item.x === x )) {
        //   let yxFalse = [playerPoints[0]]

          if (playerPoints.length >= 5) {
            // let pieceCount = 1
            // 是否连贯
            let pieces = orderBy(playerPoints, ['x', 'y'])
            let linkPiece = [pieces[0]]
            // 斜向上
            for( let i = 0; i < pieces.length; i++ ){
              let piece = pieces[i]
              
              let nextPiece = pieces.find( item => item.x === piece.x + WIDTH && item.y ===  piece.y - HEIGHT )
              let lastLinkPiece = linkPiece[linkPiece.length - 1]
              if (nextPiece && lastLinkPiece.x + WIDTH === nextPiece.x && lastLinkPiece.y - HEIGHT === nextPiece.y) {
                linkPiece.push(nextPiece)
              }
            }
            // 斜向下
            if (linkPiece.length < 5) {
              linkPiece = [pieces[0]]
              for( let i = 0; i < pieces.length; i++ ){
                let piece = pieces[i]
                
                let nextPiece = pieces.find( item => item.x === piece.x + WIDTH && item.y ===  piece.y + HEIGHT )
                if (nextPiece) {
                  linkPiece.push(nextPiece)
                }
              }
            }

  
            if (linkPiece.length >= 5) {
              return this.sendVictory()
            } 
  
          }
        // }

      for(let i = 0; i < playerPoints.length; i ++){
        let { x, y } = playerPoints[i]
        
        // 先筛选横竖两个方向是否有连着的五个棋子
        // y轴方向
        if (!yFalse.find( item => item.x === x )) {
          let yFalse = [playerPoints[i]]
          let pieces = playerPoints.filter( item => item.x === x );
          
          if (pieces.length >= 5) {
            let pieceCount = 1
            // 是否连贯
            let piecesY = pieces.map(item => item.y)
            piecesY.sort()
  
            
            piecesY.reduce((total, currentV) => {
              if (total + HEIGHT === currentV) {
                pieceCount++
                yFalse.push({x, y: total})
              }
              return currentV
            }, piecesY[0])
  
            if (pieceCount >= 5) {
              return this.sendVictory()
            } 
  
          }
        }

        // x 轴方向
        if (!xFalse.find( item => item.y === y )) {
          let xFalse = [playerPoints[i]]
          let pieces = playerPoints.filter( item => item.y === y );
          
          if (pieces.length >= 5) {
            let pieceCount = 1
            // 是否连贯
            let piecesX = pieces.map(item => item.x)
            piecesX.sort()
  
  
            piecesX.reduce((total, currentV) => {
              if (total + WIDTH === currentV) {
                pieceCount++
                xFalse.push({x, y: total})
              }
              return currentV
            }, piecesX[0])
  
            if (pieceCount >= 5) {
              return setTimeout(() => {
                this.sendVictory()
              }, 100)
            } 
  
          }
        }

      }
      
    },
    // canvas 点击事件
    canvasClickHandle(e) {
      let { x, y } = lastPoint || { x: e.layerX, y: e.layerY }
      // 超出棋盘不绘制
      if (x < start_x || x > box_w + start_x || y < start_y || y > box_h + start_y) {
        return
      }
        if (this.piecePoints.find(v => v.x === x && v.y === y )) {
          return
        }
        // 向服务器推送下棋动作
        // debugger;

        let nowPlayer = this.currentPlayer || this.pieceColor
        
        if (!nowPlayer || this.currentPlayer !== this.pieceColor) return

        this.piecePoints.push(lastPoint)
        this[`${nowPlayer}PiecePoints`].push(lastPoint)
        
        console.log('piecePoints', this.piecePoints)
        
        this.renderPiece(x, y)
        this.putDown()
        this.computeVictory(nowPlayer)
    },
    // canvas 鼠标移动事件
    canvasMouseMoveHandle(event) {
      let { layerX, layerY } = event
      this.paintBox(layerX, layerY, ctx)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.hello{
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  .container-box{
    display: flex;
  }
  .canvas-box{
    position: relative;
    .canvas-bg{
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
    }
  }
  .list-box{
    padding: 6px;
    border: 1px solid #e6e6e6;
    width: 200px;
    height: 600px;
    box-sizing: border-box;
    overflow: auto;
  }
  .user-list{
    margin-left: 10px;
  }
  .notice{
    font-weight: 600;
    margin-right: 10px;
    p{
      font-weight: 400;
      font-size: 12px;
    }
  }
  .player-list{
    margin-bottom: 10px;
    padding: 6px;
  }
}
</style>
