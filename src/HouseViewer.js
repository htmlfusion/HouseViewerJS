import {
  Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, AmbientLight,
  Object3D, Math
} from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';
import WebVRManager from './WebVRManager';

export default class {

  constructor() {
    this.rooms = {};
  }

  init(element) {

    var self = this;
    var renderer = new WebGLRenderer({antialias: true});

    renderer.setPixelRatio(window.devicePixelRatio);
    // Append the canvas element created by the renderer to document body element.
    element.appendChild(renderer.domElement);

    // Create a three.js scene.
    this.scene = new Scene();

    // Create a three.js camera.
    var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    // Apply VR headset positional data to camera.
    var controls = new VRControls(camera);

    // Apply VR stereo rendering to renderer.
    var effect = new VREffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);

    // Create an empty vr config
    window.WebVRConfig = window.WebVRConfig || {};

    // Create a VR manager helper to enter and exit VR mode.
    var params = {
      hideButton: false, // Default: false.
      isUndistorted: false // Default: false.
    };
    var manager = new WebVRManager(renderer, effect, params);

    this.roomSphere = new SphereGeometry( 500, 60, 40 );
    this.roomSphere.scale( - 1, 1, 1 );

    this.material = new MeshBasicMaterial( {} );

    mesh = new Mesh( this.roomSphere, this.material );

    var light = new AmbientLight( 0x404040 ); // soft white light

    this.scene.add( mesh );
    this.scene.add( light );

    function animate(timestamp) {
      // Update VR headset position and apply to camera.
      controls.update();
      // Render the scene through the manager.
      manager.render(self.scene, camera, timestamp);
      requestAnimationFrame(animate);
    }

    // Kick off animation loop
    animate();
  }

  sample() {
  }

  setHouse(house) {
    var self = this;
    this.rooms = {};
    this.house = house;
    this.house.data.house.rooms.forEach(function(room){
      self.rooms[room.id] = room;
    });
  }

  loadRoom(roomId, successCb, failureCb, progressCb) {
    var self = this;
    var room = this.rooms[roomId];

    var onRoomLoad = function(){
      var doors = new Object3D();

      room.passages.forEach(function(passage){
        var geometry = new SphereGeometry( 2, 32, 32 );
        var material = new MeshBasicMaterial( {color: 0xffff00} );
        var door = new Mesh( geometry, material );

        door.position.setX( - passage.position[0] );
        door.position.setY( passage.position[1] );
        door.position.setZ( passage.position[2] );
        doors.add( door );
      });

      doors.rotateY(Math.degToRad(room.heading));
      self.roomSphere.rotateY(Math.degToRad(room.heading));
      self.scene.add( doors );

      if(successCb) {
        successCb();
      }
    };
    this.loadPano(room.image, onRoomLoad, failureCb, progressCb);
  }

  loadPano(url, successCb, failureCb, progressCb) {
    // instantiate a loader
    var self = this;
    var loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");

    // load a resource
    loader.load(
      // resource URL
      url,
      // Function when resource is loaded
      function ( texture ) {
        // do something with the texture
        self.material.map = texture;
        self.material.needsUpdate = true;
        if (successCb) {
          successCb(texture);
        }
      },
      // Function called when download progresses
      function ( xhr ) {
        var progress = (xhr.loaded / xhr.total * 100);
        console.log(  progress + '% loaded' );
        if (progressCb) {
          progressCb(progress);
        }
      },
      // Function called when download errors
      function ( xhr ) {
        console.log( 'An error happened' );
        if (failureCb) {
          failureCb();
        }
      });
  }

};

