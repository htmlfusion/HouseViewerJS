import {
  Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, AmbientLight,
  Object3D, Math, Raycaster, Vector2, CylinderGeometry, GridTexture, LineBasicMaterial
} from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';
import WebVRManager from './WebVRManager';

export default class {

  constructor() {
    this.lowResUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/{house}/low/R{room}.JPG';
    this.tileUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/{house}/tiles/{col}_{row}/R{room}.JPG';
    const RADIUS = 5000;
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

    this.activeDoor = null;
    this.raycaster = new Raycaster();

    function animate(timestamp) {
      setTimeout(function () {
        // Update VR headset position and apply to camera.
        controls.update();
        // Render the scene through the manager.
        self.manager.render(self.scene, self.camera, timestamp);
        self.updateRaycaster();
        requestAnimationFrame(animate);
      }, 1000 / 60);
    }

    window.addEventListener("devicemotion", function () {
      //self.updateRaycaster();
    }, true);

    // Kick off animation loop
    animate();
  }

  createRoomMesh() {
    var roomGeometry = new SphereGeometry(this.RADIUS, 60, 60);
    roomGeometry.scale(-1, 1, 1);

    var material = new MeshBasicMaterial();
    var mesh = new Mesh(roomGeometry, material);
    mesh.name = 'room';
    return mesh;
  }

  swapRoomMesh(name, newMesh) {
    var mesh = this.scene.getObjectByName(name);
    this.scene.add(newMesh);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.material.map.dispose();
      mesh.material.dispose();
      mesh.geometry.dispose();
      return true;
    }
    return false;
  }

  getManager() {
    return this.manager;
  }

  updateRaycaster() {
    var self = this;
    var doors = this.scene.getObjectByName('doors');
    if (doors) {

      this.raycaster.setFromCamera( this.screenCenter, this.camera );

      // See if the ray from the camera into the world hits one of our meshes
      var intersects = this.raycaster.intersectObjects( doors.children, true);

      doors.children.forEach(function (door) {
        door.material.opacity = .5;
        door.needsUpdate = true;
      });

      // Toggle rotation bool for meshes that we clicked
      if ( intersects.length > 0 ) {
        intersects.forEach(function(collision){
          var door;
          if (collision.object.name === 'doorKnob') {
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

  loadHouse(house) {
    var self = this;
    this.rooms = {};
    this.house = house.data.house;
    this.house.rooms.forEach(function (room) {
      self.rooms[room.id] = room;
    });
  }

  loadRoom(roomId, successCb, failureCb, progressCb) {
    var self = this;
    var room = this.rooms[roomId];
    var heading = Math.degToRad(360) - Math.degToRad(room.heading);

    var roomMesh = this.createRoomMesh();

    // Once the high resolution is loaded, we'll complete the room setup
    var onRoomLoad = function () {

      roomMesh.rotation.y = heading;

      var doors = new Object3D();
      doors.name = 'doors';
      room.passages.forEach(function (passage) {

        var geometry = new SphereGeometry(1, 32, 32);
        var material = new MeshBasicMaterial({color: 0xffff00});
        var door = new Mesh(geometry, material);

        door.material.transparent = true;
        door.material.opacity = .5;

        door.position.setX(-passage.position[0]);
        door.position.setY(passage.position[1]);
        door.position.setZ(passage.position[2]);
        door.name = "door";
        door.passage = passage;

        // Vertical cylinder for increasing the active area of the door
        var geometry = new CylinderGeometry(4, 4, 40, 10);
        var material = new MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0, depthWrite: false});
        var doorKnob = new Mesh(geometry, material);
        doorKnob.name = "doorKnob";
        door.add(doorKnob);
        doors.add(door);
      });

      roomMesh.add(doors);
      self.swapRoomMesh('room', roomMesh);
      if (successCb) successCb();
    };

    self.loadPano(room, roomMesh, onRoomLoad, null);
  }

  pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }


  loadPano(room, roomMesh, successCb, failureCb, progressCb) {
    // instantiate a loader
    var self = this;
    var loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");

    // load a resource
    loader.load(
      // resource URL
      room.image,
      // Function when resource is loaded
      function (texture) {
        // do something with the texture
        roomMesh.material.map = texture;
        roomMesh.material.needsUpdate = true;
        if (successCb) {
          successCb(texture);
        }
      },
      // Function called when download progresses
      function (xhr) {
        var progress = (xhr.loaded / xhr.total * 100);
        console.log(progress + '% loaded');
        if (progressCb) {
          progressCb(progress);
        }
      },
      // Function called when download errors
      function (xhr) {
        console.log('An error happened');
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

