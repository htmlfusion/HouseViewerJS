import {
  Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, AmbientLight,
  Object3D, Raycaster, Vector2, CylinderGeometry, GridTexture, LineBasicMaterial, ShaderMaterial, ImageUtils,
  DoubleSide, Matrix4, Vector3, Geometry, Face3, GridHelper, WireframeHelper
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
    this.previousShot = null;
    this.imagePlane = null;
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


    var size = 10;
    var step = 1;

    //var gridHelper = new GridHelper( size, step );
    //this.scene.add( gridHelper );

    // Create a three.js camera.
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.03, 10000);

    // Apply VR headset positional data to camera.
    this.controls = new VRControls(this.camera);

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

    var texture = new GridTexture( 256, 128, 16, 16 );
    material = new MeshBasicMaterial( {map: texture, transparent: true} );

    this.raycaster = new Raycaster();

    function animate(timestamp) {
      setTimeout(function(){
        // Update VR headset position and apply to camera.
        self.controls.update();
        // Render the scene through the manager.
        self.manager.render(self.scene, self.camera, timestamp);
        requestAnimationFrame(animate);
      }, 1000/60);
    }

    //window.addEventListener("devicemotion", function(){
    //  self.updateRaycaster();
    //}, true);


    // Kick off animation loop
    animate();
  }

  getManager() {
    return this.manager;
  }

  updateRaycaster() {
    var self = this;
  }

  setHouse(house) {
    this.house = house[0];
    this.camera.reconstruction = this.house;
  }

  loadRoom(roomId, successCb, failureCb, progressCb) {
    this.camera.shot_id = 'R0010357_20160113131925.JPG';
    this.camera.shot_id = 'R0010344_20160113131531.JPG';
    this.camera.shot_id = 'R0010369_20160113135014.JPG';
    var shot = this.camera.reconstruction.shots[this.camera.shot_id];
    var position = this.opticalCenter(shot);

    this.camera.position.x = position.x;
    this.camera.position.y = position.y;
    this.camera.position.z = position.z;
    var parent = new Object3D();

    parent.position.x = position.x;
    parent.position.y = position.y;
    parent.position.z = position.z;


    var cam = this.camera.reconstruction.cameras[shot.camera];
    this.imagePlane = new Mesh();
    this.imagePlane.position.x = position.x * -1;
    this.imagePlane.position.y = position.y * -1;
    this.imagePlane.position.z = position.z * -1;
    this.imagePlane.material = this.createImagePlaneMaterial(cam, shot, this.camera.shot_id)
    this.imagePlane.geometry = this.imagePlaneGeo(this.camera.reconstruction, this.camera.shot_id);

    parent.add(this.imagePlane);
    parent.rotation.x = -Math.PI/2;

    this.scene.add(parent);

    //var wireframe = new WireframeHelper( this.imagePlane, 0x00ff00 );
    //this.scene.add(wireframe);

    this.imagePlane.geometry.needsUpdate = true;

    //this.setImagePlaneCamera(this.camera);
    //self.loadPanoTiles(room, onRoomLoad, onRoomLoad);
  }

  setImagePlaneCamera(cameraObject) {
    var r = cameraObject.reconstruction;
    var shot_id = cameraObject.shot_id;
    var shot = r['shots'][shot_id];
    var cam = r['cameras'][shot['camera']];

    this.imagePlane.material.uniforms.focal.value = this.imagePlane.material.uniforms.focal.value;
    this.imagePlane.material.uniforms.k1.value = this.imagePlane.material.uniforms.k1.value;
    this.imagePlane.material.uniforms.k2.value = this.imagePlane.material.uniforms.k2.value;
    this.imagePlane.material.uniforms.scale_x.value = this.imagePlane.material.uniforms.scale_x.value;
    this.imagePlane.material.uniforms.scale_y.value = this.imagePlane.material.uniforms.scale_y.value;

    this.imagePlane.material = this.createImagePlaneMaterial(cam, shot, shot_id);
    this.imagePlane.geometry = this.imagePlaneGeo(r, shot_id);

    //if (this.previousShot !== cameraObject.shot_id) {
    //  this.previousShot = cameraObject.shot_id
    //  var image_url = this.imageURL(shot_id);
    //
    //  if (imagePlaneCamera !== undefined) {
    //    if (imagePlaneCameraOld === undefined || imagePlaneCamera.shot_id !== cameraObject.shot_id) {
    //      imagePlaneCameraOld = imagePlaneCamera;
    //      imagePlaneOld.material.uniforms.projectorTex.value = imagePlane.material.uniforms.projectorTex.value;
    //      imagePlaneOld.material.uniforms.projectorMat.value = imagePlane.material.uniforms.projectorMat.value;
    //      imagePlane.material.uniforms.focal.value = imagePlane.material.uniforms.focal.value;
    //      imagePlane.material.uniforms.k1.value = imagePlane.material.uniforms.k1.value;
    //      imagePlane.material.uniforms.k2.value = imagePlane.material.uniforms.k2.value;
    //      imagePlane.material.uniforms.scale_x.value = imagePlane.material.uniforms.scale_x.value;
    //      imagePlane.material.uniforms.scale_y.value = imagePlane.material.uniforms.scale_y.value;
    //      imagePlaneOld.material.vertexShader = imagePlane.material.vertexShader;
    //      imagePlaneOld.material.fragmentShader = imagePlane.material.fragmentShader;
    //      imagePlaneOld.material.needsUpdate = true;
    //
    //      imagePlaneOld.geometry.dispose();
    //      imagePlaneOld.geometry = this.imagePlaneGeo(imagePlaneCameraOld.reconstruction, imagePlaneCameraOld.shot_id);
    //    }
    //  }
    //
    //  imagePlaneCamera = cameraObject;
    //  imagePlane.material.dispose();
    //  imagePlane.geometry.dispose();
    //  imagePlane.material = this.createImagePlaneMaterial(cam, shot, shot_id);
    //  imagePlane.geometry = this.imagePlaneGeo(r, shot_id);
    // }
  }


  createImagePlaneMaterial(cam, shot, shot_id) {
    ImageUtils.crossOrigin = 'anonymous';
    var imageTexture = ImageUtils.loadTexture(this.imageURL(shot_id));

    cam.width = 4096;
    cam.height = 2048;

    var material = new ShaderMaterial({
      side: DoubleSide,
      transparent: true,
      depthWrite: true,
      uniforms: {
        projectorMat: {
          type: 'm4',
          value: this.projectorCameraMatrix(cam, shot)
        },
        projectorTex: {
          type: 't',
          value: imageTexture
        },
        opacity: {
          type: 'f',
          value: 1
        },
        focal: {
          type: 'f',
          value: cam.focal
        },
        k1: {
          type: 'f',
          value: cam.k1
        },
        k2: {
          type: 'f',
          value: cam.k2
        },
        scale_x: {
          type: 'f',
          value: Math.max(cam.width, cam.height) / cam.width
        },
        scale_y: {
          type: 'f',
          value: Math.max(cam.width, cam.height) / cam.height
        }
      },
      vertexShader: this.imageVertexShader(),
      fragmentShader: this.imageFragmentShader()
    });

    return material;
  }

  imageURL(shotId) {
    return 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/9999/high/' + shotId;
  }

  opticalCenter(shot) {
    var angleaxis = [-shot.rotation[0],
      -shot.rotation[1],
      -shot.rotation[2]];
    var Rt = this.rotate(shot.translation, angleaxis);
    Rt.negate();
    return Rt;
  }


  imagePlaneGeo(reconstruction, shot_id) {
    var shot = reconstruction.shots[shot_id];
    var cam = reconstruction.cameras[shot.camera];

    if ('vertices' in shot) {
      var geometry = new Geometry();
      for (var i = 0; i < shot['vertices'].length; ++i) {
        geometry.vertices.push(
          new Vector3(
            shot['vertices'][i][0],
            shot['vertices'][i][1],
            shot['vertices'][i][2]
          )
        );
      }
      for (var i = 0; i < shot['faces'].length; ++i) {
        var v0 = shot['faces'][i][0];
        var v1 = shot['faces'][i][1];
        var v2 = shot['faces'][i][2];

        geometry.faces.push(new Face3(v0, v1, v2));
      }
      return geometry;
    } else {
      return this.imageSphereGeoFlat(cam, shot);
    }
  }

  imageSphereGeoFlat(cam, shot) {
    geometry = new SphereGeometry(
      options.imagePlaneSize,
      20,
      40
    );
    var center = this.pixelToVertex(cam, shot, 0, 0, 0);
    geometry.applyMatrix(new Matrix4().makeTranslation(center.x, center.y, center.z));
    return geometry;
  }

  pixelToVertex(cam, shot, u, v, scale) {
    // Projection model:
    // xc = R * x + t
    // u = focal * xc / zc
    // v = focal * yc / zc

    var zc = scale;
    var xc = u / cam.focal * zc;
    var yc = v / cam.focal * zc;

    var xct = [xc - shot.translation[0],
      yc - shot.translation[1],
      zc - shot.translation[2]];


    var angleaxis = [-shot.rotation[0],
      -shot.rotation[1],
      -shot.rotation[2]];

    return this.rotate(xct, angleaxis);
  }

  rotate(vector, angleaxis) {
    var v = new Vector3(vector[0], vector[1], vector[2]);
    var axis = new Vector3(angleaxis[0],
      angleaxis[1],
      angleaxis[2]);
    var angle = axis.length();
    axis.normalize();
    var matrix = new Matrix4().makeRotationAxis(axis, angle);
    v.applyMatrix4(matrix);
    return v;
  }

  imageVertexShader() {
    return require('./shaders/vertexshaderEquirectangular');
  }

  imageFragmentShader() {
    return require('./shaders/fragmentshaderEquirectangular');
  }

  projectorCameraMatrix(cam, shot) {
    var angleaxis = shot.rotation;
    var axis = new Vector3(angleaxis[0],
      angleaxis[1],
      angleaxis[2]);
    var angle = axis.length();
    axis.normalize();
    var rotation = new Matrix4().makeRotationAxis(axis, angle);
    var t = shot.translation;
    var translation = new Vector3(t[0], t[1], t[2]);
    rotation.setPosition(translation);

    return rotation;

    if (cam.projection_type == 'equirectangular' || cam.projection_type == 'spherical')
      return rotation
    var dx = cam.width / Math.max(cam.width, cam.height) / cam.focal;
    var dy = cam.height / Math.max(cam.width, cam.height) / cam.focal;
    var projection = new Matrix4().makeFrustum(-dx, +dx, +dy, -dy, -1, -1000);
    return projection.multiply(rotation);
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

