import React, { Component } from 'react';
import Ship from './Ship';
import Asteroid from './Asteroid';
import { randomNumBetweenExcluding } from './helpers';
import Backbone from 'backbone'
import axios from 'axios'
import asteroidApiObj from './asteroidApiObj.js'
const KEY = {
  LEFT:  37,
  RIGHT: 39,
  UP: 38,
  A: 65,
  D: 68,
  W: 87,
  SPACE: 32
};

export class Reacteroids extends Component {
  constructor() {
    // get only asteroids that have close_approach_data
    var closeAppoachAsteroids = asteroidApiObj.near_earth_objects
      .filter(function(asteroid) {
        return asteroid.close_approach_data.length > 0;
      });
    var mappedAsteroidData = closeAppoachAsteroids.map(function(asteroid) {
      var sizeInKm = asteroid.estimated_diameter.kilometers;
      return {
        name: asteroid.name,
        earliestApproachDate: asteroid.close_approach_data[0].close_approach_date,
        missDistanceInKm: +asteroid.close_approach_data[0].miss_distance.kilometers, //convert string to number
        orbitingBody: asteroid.close_approach_data[0].orbiting_body,
        sizeInKm: (sizeInKm.estimated_diameter_max + sizeInKm.estimated_diameter_min) / 2,
        speedInKm: +asteroid.close_approach_data[0].relative_velocity.kilometers_per_hour //convert string to number
      }
    });

    console.log('mappedAsteroidData', mappedAsteroidData);
    super();
    this.state = {
      asteroidData: mappedAsteroidData,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      },
      context: null,
      keys : {
        left  : 0,
        right : 0,
        up    : 0,
        down  : 0,
        space : 0,
      },
      asteroidCount: 1,
      currentScore: 0,
      topScore: localStorage['topscore'] || 0,
      inGame: false,
      backgroundCanvas: null
    }
    this.ship = [];
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
  }

  handleResize(value, e){
    this.setState({
      screen : {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      }
    });
  }

  handleKeys(value, e){
    let keys = this.state.keys;
    if(e.keyCode === KEY.LEFT   || e.keyCode === KEY.A) keys.left  = value;
    if(e.keyCode === KEY.RIGHT  || e.keyCode === KEY.D) keys.right = value;
    if(e.keyCode === KEY.UP     || e.keyCode === KEY.W) keys.up    = value;
    if(e.keyCode === KEY.SPACE) keys.space = value;
    this.setState({
      keys : keys
    });
  }


  componentDidMount() {

    window.addEventListener('keyup',   this.handleKeys.bind(this, false));
    window.addEventListener('keydown', this.handleKeys.bind(this, true));
    window.addEventListener('resize',  this.handleResize.bind(this, false));

    const context = this.refs.canvas.getContext('2d');
    const background = document.querySelector('#bg').getContext('2d')
   
    this.setState({ context: context, backgroundCanvas: background});
    this.startGame();
    requestAnimationFrame(() => {this.update()});

    window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)}}();

    

  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleKeys);
    window.removeEventListener('resize', this.handleKeys);
    window.removeEventListener('resize', this.handleResize);
  }


  update() {
    const context = this.state.context;
    const keys = this.state.keys;
    const ship = this.ship[0];

    context.save();
    context.scale(this.state.screen.ratio, this.state.screen.ratio);

    // Motion trail
    context.globalAlpha = 0.4;
    context.fillRect(0, 0, this.state.screen.width, this.state.screen.height);
    context.clearRect(0, 0, this.state.screen.width, this.state.screen.height)
    context.globalAlpha = 1;

    // Next set of asteroids
    if(!this.asteroids.length){
      let count = this.state.asteroidCount + 1;
      this.setState({ asteroidCount: count });
      this.generateAsteroids(count)
    }

    // Check for colisions
    this.checkCollisionsWith(this.bullets, this.asteroids);
    this.checkCollisionsWith(this.ship, this.asteroids);

    // Remove or render
    this.updateObjects(this.particles, 'particles')
    this.updateObjects(this.asteroids, 'asteroids')
    this.updateObjects(this.bullets, 'bullets')
    this.updateObjects(this.ship, 'ship')



    context.restore();

    var ctx = document.querySelector('#bg').getContext('2d')
    if(ctx != null){
      ctx.save();
      //ctx.scale(this.state.screen.ratio, this.state.screen.ratio);
      
      var cw = ctx.width = this.state.screen.width;
      var ch = ctx.height = this.state.screen.height;
      var rand = function(a,b){return ~~((Math.random()*(b-a+1))+a);}
          
      var updateAll = function(a){
        var i = a.length;
        while(i--){
          a[i].update(i);  
        }
      }
            
      var renderAll = function(a){
        var i = a.length;
        while(i--){
          a[i].render(i);  
        }
      }

      var stars = [];

      var Star = function(x, y, radius, speed){
        this.x = x;
        this.y = y;
        this.speed = (speed/25);
        this.radius = radius;
        this.saturation = (20+(this.radius)*5);
        this.lightness = (8+this.radius*4);
      }
        
      Star.prototype = {
        update: function(i){
          this.x += this.speed;
          if(this.x - this.radius >= cw){
            this.x = rand(0, ch-this.radius)
            this.x = -this.radius;
          }
      },
      render: function(){
        ctx.beginPath();
        ctx.arc(this.x, this.y, (this.radius < 0) ? 0 : this.radius, 0, Math.PI *2, false);
        var flickerAdd = (rand(0, 140) === 0) ? rand(5, 20) : 0;
        ctx.fillStyle = 'hsl(240, '+this.saturation+'%, '+(this.lightness+flickerAdd)+'%)';
        ctx.fill();

        }
      }
          
      var makeStarfield = function(){
        var base = .75;
        var inc = .2;
        var count = 10;
        var per = 6;
        while(count--){
          var radius = base + inc;
          var perTime = per;
          while(perTime--){
            radius += inc;
            stars.push(new Star(rand(0, cw-radius), rand(0, ch-radius), radius, radius*3));
          }
        }
      }

      if(!stars.length){
         makeStarfield(); 
      }
      
      updateAll(stars);
      ctx.clearRect(0, 0, cw, ch);  
      renderAll(stars);
      ctx.restore()
      }
    // Next frame
    requestAnimationFrame(() => {this.update()});
  }

  addScore(points){
    if(this.state.inGame){
      this.setState({
        currentScore: this.state.currentScore + points,
      });
    }
  }

  startGame(){
    this.setState({
      inGame: true,
      currentScore: 0,
    });

    // Make ship
    let ship = new Ship({
      position: {
        x: this.state.screen.width/2,
        y: this.state.screen.height/2
      },
      create: this.createObject.bind(this),
      onDie: this.gameOver.bind(this)
    });
    this.createObject(ship, 'ship');

    // Make asteroids
    this.asteroids = [];
    this.generateAsteroids(this.state.asteroidCount)
    
  }

  gameOver(){
    this.setState({
      inGame: false,
    });

    // Replace top score
    if(this.state.currentScore > this.state.topScore){
      this.setState({
        topScore: this.state.currentScore,
      });
      localStorage['topscore'] = this.state.currentScore;
    }
  }

  generateAsteroids(count){
    
    let asteroids = [];
    let ship = this.ship[0];

    for (let i = 0; i < count && this.state.asteroidData.length > 0 ; i++) {
      

      if(this.state.asteroidData[i]){

        let asteroid = new Asteroid({

        size: 80,
        position: {
          x: randomNumBetweenExcluding(0, this.state.screen.width, ship.position.x-60, ship.position.x+60),
          y: randomNumBetweenExcluding(0, this.state.screen.height, ship.position.y-60, ship.position.y+60)
        },
        create: this.createObject.bind(this),
        addScore: this.addScore.bind(this),
        isChunk: false,
        theAsteroidData: this.state.asteroidData[i]
      
        });

        this.createObject(asteroid, 'asteroids');
       
        this.setState({asteroidData: this.state.asteroidData.slice(1)})

      }

    }

  }

  createObject(item, group){
    this[group].push(item);
  }

  updateObjects(items, group){
    let index = 0;
    for (let item of items) {
      if (item.delete) {
        this[group].splice(index, 1);
      }else{
        items[index].render(this.state);
      }
      index++;
    }
  }

  checkCollisionsWith(items1, items2) {
    var a = items1.length - 1;
    var b;
    for(a; a > -1; --a){
      b = items2.length - 1;
      for(b; b > -1; --b){
        var item1 = items1[a];
        var item2 = items2[b];
        if(this.checkCollision(item1, item2)){
          item1.destroy();
          item2.destroy();
        }
      }
    }
  }

  checkCollision(obj1, obj2){
    var vx = obj1.position.x - obj2.position.x;
    var vy = obj1.position.y - obj2.position.y;
    var length = Math.sqrt(vx * vx + vy * vy);
    if(length < obj1.radius + obj2.radius){
      return true;
    }
    return false;
  }

  render() {
    let endgame;
    let message;

    console.log('this.state.asteroidData', this.state.asteroidData)

    if (this.state.currentScore <= 0) {
      message = '0 points... So sad.';
    } else if (this.state.currentScore >= this.state.topScore){
      message = 'Top score with ' + this.state.currentScore + ' points. Woo!';
    } else {
      message = this.state.currentScore + ' Points though :)'
    }

    if(!this.state.inGame){
      endgame = (
        <div className="endgame">
          <p>Game over, man!</p>
          <p>{message}</p>
          <button
            onClick={ this.startGame.bind(this) }>
            try again?
          </button>
        </div>
      )
    }

    return (
      <div>

        
        { endgame }
        <span className="score current-score" >Score: {this.state.currentScore}</span>
        <span className="score top-score" >Top Score: {this.state.topScore}</span>
        <span className="controls" >
          Use [A][S][W][D] or [←][↑][↓][→] to MOVE<br/>
          Use [SPACE] to SHOOT
        </span>
        <canvas id="bg" ref="bgCanvas"
          width={this.state.screen.width * this.state.screen.ratio}
          height={this.state.screen.height * this.state.screen.ratio}

        />
        <div id="light"></div>
        <canvas ref="canvas"
          width={this.state.screen.width * this.state.screen.ratio}
          height={this.state.screen.height * this.state.screen.ratio}

        />

      </div>
    );
  }
}
