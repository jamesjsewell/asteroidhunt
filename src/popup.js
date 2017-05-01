export default class Popup {
  constructor(args) {
    this.position = args.position
    this.velocity = args.velocity
    this.radius = args.size;
    this.lifeSpan = args.lifeSpan;
    this.inertia = 2;
    this.theAsteroidData = args.theAsteroidData;
    this.points = args.addScore
    this.isChunk = args.isChunk
  }

  destroy(){
    this.delete = true;
  }

  render(state){
   // Move
    // this.position.x += this.velocity.x;
    // this.position.y += this.velocity.y;
    // this.velocity.x *= this.inertia;
    // this.velocity.y *= this.inertia;

    //Shrink
    // this.radius -= 0.1;
    // if(this.radius < 0.1) {
    //   this.radius = 0.1;
    // }
    if(this.lifeSpan-- < 0){
      this.destroy()
    }

    // Draw
    const context = state.context;
    context.save();
    context.translate(this.position.x, this.position.y);
    // context.fillStyle = 'white';

    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(0, -this.radius);
    context.arc(0, 0, this.radius, 0, 2 * Math.PI);
    context.closePath();
    context.fillStyle = "white"
    context.font = "24px Arial"

    if(this.isChunk === true){

      context.fillText('+ '+this.points,10,20)
      context.textAlign = "center"
      context.fill()

    }

    if(this.isChunk === false && this.theAsteroidData != undefined){

      context.fillText(this.theAsteroidData.name,10,20)
      context.textAlign = "center"
      context.fill()
      
    }

    context.restore();
  }
}