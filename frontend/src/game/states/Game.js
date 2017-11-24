/* globals __DEV__ */
import Phaser from 'phaser';
import Player from '../objects/Player';

import Web3 from 'web3';

const io = require('socket.io-client');

const TESTING = true;

export default class extends Phaser.State {

  create () {

    this.players = {};
    this.dots = {};

    this.web3 = new Web3(window.web3.currentProvider);

    this.playerAddr = web3.eth.accounts[0];

    if (TESTING) {
      this.playerAddr = Math.random().toString(36).substr(2, 10);
    }

    game.physics.startSystem(Phaser.Physics.ARCADE);    
    
    game.world.setBounds(0, 0, 2000, 2000);

    game.add.tileSprite(0, 0, game.world.width, game.world.height, 'background');

    this.dotGroup = this.game.add.group();

    this.player = game.add.sprite(500, 500, 'decenter');
    this.player.anchor.set(0.5);
    
    this.game.physics.startSystem(Phaser.Physics.ARCADE);  
    this.game.physics.arcade.enable(this.player);  
    
    // game.camera.deadzone = new Phaser.Rectangle(100, 100, 800, 800);
    game.camera.follow(this.player);

    this.socket = io('http://localhost:60000');

    this.socket.emit('join-game', this.player.position, this.playerAddr);

    this.socket.on('load-players', (players) => {
      for (const address of Object.keys(players)) {
        if(this.playerAddr !== address) {
          this.addPlayer(players[address], address);
        }
      }
    });

    this.socket.on('load-dots', (dots) => {
      for (const key of Object.keys(dots)) {
        this.addDot(dots[key]);
      }
    });

    this.socket.on('player-move', (pos, address) => {
      if(this.players[address]) {
        this.players[address].x = pos.x;
        this.players[address].y = pos.y;
      }
    });

    this.socket.on('player-added', (pos, address) => {
      this.addPlayer(pos, address);
    });

    this.socket.on('add-dot', (pos) => {
      this.addDot(pos);
    });

    this.socket.on('remove-dot', (pos) => {
      this.dots[pos.x + " " + pos.y].kill();
    });

  }

  addPlayer(pos, address) {
    this.players[address] = this.game.add.sprite( 200, 200, 'decenter');;
    
    this.players[address].anchor.set(0.5);
    this.game.physics.arcade.enable(this.players[address]);  
  }

  followMouse() {
    if (this.game.physics.arcade.distanceToPointer(this.player, this.game.input.activePointer) > 8) {
        this.game.physics.arcade.moveToPointer(this.player, 300);
    } else {
        this.player.body.velocity.set(0);
    }
  }

  addDot(pos) {
    const dot = this.game.add.sprite(pos.x, pos.y, 'dot');
    this.game.physics.arcade.enable(dot);  
    this.dotGroup.add(dot);
    this.dots[pos.x + " " + pos.y] = dot;

  }

  dotEaten(player, dot) {
    this.socket.emit('dot-eaten', dot.position);
    dot.kill();
  }

  render() {
    game.debug.cameraInfo(game.camera, 32, 32);
  }

  update() {
    this.socket.emit('move', this.player.position, this.playerAddr);

    this.game.physics.arcade.overlap(this.player, this.dotGroup, this.dotEaten, null, this);

    this.followMouse();
  }
}
