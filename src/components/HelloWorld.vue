<template>
  <div class="hello">
    <div class="canvas-box" style="width: 520px;">
      <canvas ref="canvas" height="600" width="600" style="border: 1px #eae8e8 solid"></canvas>
      <canvas ref="canvasBG" height="600" width="600" class="canvas-bg"></canvas>
    </div>
  </div>
</template>

<script>
const HEIGHT = 50
const WIDTH = 50
const start_x = 50
const start_y = 50
const box_w = 500
const box_h = 500
const dash_box_wh = 40

var ctx = null
var lastPoint = null
var nowPoint = null


export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  data() {
    return {
      piecePoints: [],
      whitePiecePoints: [],
      blackPiecePoints: [],
      currentPlayer: 'black'
    }
  },
  mounted(){
    this.$nextTick(()=>{
      let canvas = this.$refs.canvas
      ctx = canvas.getContext ? canvas.getContext('2d') : {}
      canvas.addEventListener('click', () => {
        let { x, y } = lastPoint
        // 超出棋盘不绘制
        if (this.overChessBoard(x, y)) {
          return
        }
        if (this.piecePoints.find(v => v.x === x && v.y === y )) {
          return
        }

        nowPoint = lastPoint
        this.piecePoints.push(nowPoint)
        this[`${this.currentPlayer}PiecePoints`].push(nowPoint)
        
        this.clearSelectBox(x, y, dash_box_wh)
        this.paintPiece(x, y, ctx)
      })
      canvas.addEventListener('mousemove', (event) => {
        let { layerX, layerY } = event
        this.paintBox(layerX, layerY, ctx)
      });
      this.paintGrid(box_w, box_h)
      
    })
  },
  methods: {
    // 画背景
    paintGrid(boxWidth, boxHeight) {
      let canvas = this.$refs.canvasBG
      let ctx = canvas.getContext('2d')
      // 画竖线
      for(let i = 0; i <= boxWidth / WIDTH; i++) {
        let x = i * WIDTH + start_x
        let y0 = start_y
        let y1 = boxHeight + start_y
        
        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
      }
      // 画横线
      for(let i = 0; i <= boxHeight / HEIGHT; i++) {
        let y = i * HEIGHT + start_y
        let x0 = start_x
        let x1 = boxHeight + start_x
        
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
      
      x = x < 0 ? start_x : x
      y = y < 0 ? start_y : y
      
      if (lastPoint) {
        let { x: lx, y: ly } = lastPoint
        // 如果已点击，则表示棋子已下，则不清空
        // 鼠标经过曾经下过的棋子，也不清空
        let lastPointHas = !!this.piecePoints.find(v => v.x === lx && v.y === ly)
        
        if (!lastPointHas) {
          this.clearSelectBox(lx, ly, wh)
        }
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
      if (this.overChessBoard(layerX, layerY)) {
        return
      }
      

      this.paintDashSelect(x - wh / 2, y - wh / 2, ctx, wh)
      
    },
    // 鼠标所在点，x, y 为左上角坐标
    paintDashSelect(x, y, ctx, width) {
      let lineW = width / 3
      // 左上角折线
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
    // 是否超出棋盘
    overChessBoard(x, y) {
      return x < start_x || x > box_w + start_x || y < start_y || y > box_h + start_y
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
  .canvas-box{
    position: relative;
    .canvas-bg{
      position: absolute;
      top: 0;
      left: 0;
      z-index: -1;
    }
  }
}
</style>
