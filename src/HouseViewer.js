import {
  Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, AmbientLight,
  Object3D, Math, Raycaster, Vector2, CylinderGeometry, GridTexture, LineBasicMaterial
} from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';
import WebVRManager from './webvr-manager';

export default class {


  constructor() {
    this.lowResUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/{house}/low/R{room}.JPG';
    this.tileUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/{house}/tiles/{col}_{row}/R{room}.JPG';
    this.rooms = {};
    this.activeDoor = null;
    this.tileTimeouts = [];
  }

  init(element) {
    var self = this;

    element.addEventListener('click', this.onClick.bind(this));
    var renderer = new WebGLRenderer({antialias: true});

    renderer.setPixelRatio(window.devicePixelRatio);
    // Append the canvas element created by the renderer to document body element.
    element.appendChild(renderer.domElement);

    this.screenCenter = new Vector2(0, 0);

    // Create a three.js scene.
    this.scene = new Scene();

    // Create a three.js camera.
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 10, 6000);

    // Apply VR headset positional data to camera.
    var controls = new VRControls(this.camera);

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
    this.manager = new WebVRManager(renderer, effect, params);

    var radius = 5000;
    var geometry = new SphereGeometry( radius, 60, 40 );
    geometry.scale( - 1, 1, 1 );

    var texture = new GridTexture( 256, 128, 16, 16 );
    material = new MeshBasicMaterial( {map: texture, transparent: true} );

    this.roomSphere = new Mesh( geometry, material );


    var lowResTexture = new MeshBasicMaterial();

    var geometry = new SphereGeometry( radius+200, 60, 40 );
    geometry.scale( - 1, 1, 1 );

    this.roomSphereLow = new Mesh( geometry, lowResTexture );


    this.scene.add( this.roomSphere );
    this.scene.add( this.roomSphereLow );

    this.raycaster = new Raycaster();

    function animate(timestamp) {
      setTimeout(function(){
        // Update VR headset position and apply to camera.
        controls.update();
        // Render the scene through the manager.
        self.manager.render(self.scene, self.camera, timestamp);
        requestAnimationFrame(animate);
      }, 1000/60);
    }

    window.addEventListener("devicemotion", function(){
      self.updateRaycaster();
    }, true);


    // Kick off animation loop
    animate();
  }

  getManager() {
    return this.manager;
  }

  updateRaycaster() {
    var self = this;
    if (this.currentDoors) {

      this.activeDoor = null;

      this.raycaster.setFromCamera( this.screenCenter, this.camera );

      // See if the ray from the camera into the world hits one of our meshes
      var intersects = this.raycaster.intersectObjects( this.currentDoors.children, true);

      this.currentDoors.children.forEach(function (door) {
        door.material.opacity = .5;
        door.needsUpdate = true;
      });

      // Toggle rotation bool for meshes that we clicked
      if ( intersects.length > 0 ) {
        intersects.forEach(function(collision){
          var door;
          if (collision.object.name === 'doorProxy') {
            door = collision.object.parent;
          } else {
            door = collision.object;
          }

          self.activeDoor = door;

          door.material.opacity = 1;
          door.needsUpdate = true;
        });
      }
    }
  }

  setHouse(house) {
    var self = this;
    this.rooms = {};
    this.house = house;
  }

  loadRoom(roomId, successCb, failureCb, progressCb) {
    var self = this;
    var room = this.rooms[roomId];
    var heading = Math.degToRad(360) - Math.degToRad(room.heading);

    if (self.currentDoors) {
      this.scene.remove(self.currentDoors);
    }

    // When low resolution is loaded, we'll setup the sphere to be oriented correctly
    var basicInit = function () {
      self.roomSphere.rotation.y = heading;
    };

    // Once the high resolution is loaded, we'll complete the room setup
    var onRoomLoad = function(){

      basicInit()

      var doors = new Object3D();

      room.passages.forEach(function(passage) {

        var geometry = new SphereGeometry( 1, 32, 32 );
        var material = new MeshBasicMaterial( {color: 0xffff00} );
        var door = new Mesh( geometry, material );

        door.material.transparent = true;
        door.material.opacity = .5;

        door.position.setX( - passage.position[0] );
        door.position.setY( passage.position[1] );
        door.position.setZ( passage.position[2] );
        door.name = "door";
        door.passage = passage;

        var geometry = new CylinderGeometry( 4, 4, 40, 10 );
        var material = new MeshBasicMaterial( { color: 0x00ff00, transparent: true, opacity: 0, depthWrite: false } );
        var proxy = new Mesh( geometry, material );
        proxy.name = "doorProxy";

        door.add(proxy);
        doors.add( door );
      });


      doors.rotation.y = heading;
      doors.scale.set(2,2,2);
      self.roomSphereLow.rotation.y = heading;
      self.scene.add( doors );
      self.currentDoors = doors;

      if(successCb) {
        successCb();
      }
    };

    self.loadPanoTiles(room, onRoomLoad, onRoomLoad);
  }

  pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  clearPano() {
    this.tileTimeouts.forEach(function(id) {
      clearTimeout(id);
    });
    this.tileTimeouts = [];
    var texture = new GridTexture( 256, 128, 16, 16 );
    material = new MeshBasicMaterial( {map: texture, transparent: true} );
    this.roomSphere.material = material;
  }


  loadPanoTiles(room, successCb, failureCb) {
    var self = this;

    var loader = new TextureLoader();

    loader.setCrossOrigin("anonymous");

    self.clearPano();

    loader.load(this.lowResUrl.replace('{house}', self.house.id).replace('{room}', room.id), function(texture) {
      var material = new MeshBasicMaterial( {map: texture} );
      self.roomSphereLow.material = material;
      if (successCb) {
        successCb();
      }
    });

    var id = setTimeout(function(){

      var offset = 0;
      for (var c = 1; c < 17; c++) {

        for (var r = 1; r < 17; r++) {

          var makeTile = function(c, r) {

            return function() {

              var tile = self.tileUrl
                .replace('{house}', self.house.id)
                .replace('{room}', room.id)
                .replace('{col}', c)
                .replace('{row}', r);

              var patchTex = function ( tile, r, c) {
                return function(unitTexture) {
                  console.log(tile);
                  self.roomSphere.material.map.patchTexture(unitTexture, (c-1)*256, (2048-(r-1)*128)-128);
                }
              };

              loader.load( tile, patchTex(tile, r, c) );
            };
          };

          var id2 = setTimeout(makeTile(c, r), offset * 10);

          offset += 1;
          self.tileTimeouts.push(id2);
        }
      }
    }, 500);
    self.tileTimeouts.push(id);
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
        var material = new MeshBasicMaterial( {map: texture} );
        self.roomSphere.material = material;
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

  onClick(event) {
    if (this.activeDoor) {
      this.loadRoom(this.activeDoor.passage.roomId);
    }
  }

};

