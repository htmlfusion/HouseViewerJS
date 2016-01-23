import {
  Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh, TextureLoader, AmbientLight,
  Object3D, Raycaster, Vector2, CylinderGeometry, GridTexture, LineBasicMaterial, ShaderMaterial, ImageUtils,
  DoubleSide, Matrix4, Vector3, Geometry, Face3, GridHelper, WireframeHelper, PlaneGeometry, Matrix3
} from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';
import WebVRManager from './webvr-manager';
import TWEEN from 'tween.js';

export default class {


  constructor() {
    this.rootUrl = 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted';
    this.tileTimeouts = [];
    this.hoverShot = null


    this.imagePlane = null;
    this.imagePlaneLow = null;

    this.toImagePlane = null;
    this.toImagePlaneLow = null;
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

    //var gridHelper = new GridHelper( size, step );
    //this.scene.add( gridHelper );

    // Create a three.js camera.
    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.03, 100);


    // Apply VR headset positional data to camera.
    //this.camera.rotateX(Math.PI/2);
    this.controls = new VRControls(this.camera);


    var geometry = new SphereGeometry( .05, 16  );
    geometry.translate( 0, 0, 0 );
    //geometry.rotateX( Math.PI / 2 );

    var material = new MeshBasicMaterial( { color: 0xb3d9ff } );
    this.retical = new Mesh( geometry, material );
    this.scene.add( this.retical );

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

        // Update ray caster
        self.updateRaycaster();

        // Interpolate stuff
        TWEEN.update(timestamp);

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

    if (self.imagePlane) {
      this.raycaster.setFromCamera( self.screenCenter, self.camera );

      // See if the ray from the camera into the world hits one of our meshes
      var intersects = this.raycaster.intersectObject( this.imagePlane );

      // Toggle rotation bool for meshes that we clicked
      if ( intersects.length > 0 ) {
        //self.retical.position.set( 0, 0, 0 );
        //var normalMatrix = new Matrix3().getNormalMatrix( intersects[ 0 ].face.normal );
        //
        //var worldNormal = intersects[ 0 ].face.normal.clone().applyMatrix3( normalMatrix ).normalize();
        //
        //self.retical.lookAt( worldNormal );
        self.retical.position.copy( intersects[ 0 ].point );
        self.hoverShot = self.nearestShot(intersects[ 0 ].point);
      }

    }

  }

  goto(vector) {
    var self = this;
    var start = this.camera.position.clone();
    var distance = start.distanceTo(vector);

    var duration = distance * 200;

    // Animate camera
    var tween = new TWEEN.Tween(start)
      .to(vector, duration)
      .onUpdate(function() {
        console.log(this.x, this.y, this.z);
        self.camera.position.set(this.x, this.y, this.z);
      })
      .start();

    // Fade out the old image plane
    var crossFade = new TWEEN.Tween({opacity: 1})
      .to({opacity: 0}, duration)
      .onUpdate(function() {
        console.log(this.opacity);
        var opacityIn = 1 - this.opacity;
        if (self.imagePlane) {
          self.imagePlane.material.opacity = this.opacity;
          self.imagePlane.material.uniforms.opacity.value = this.opacity;
          self.imagePlane.material.needsUpdate = true;

          self.toImagePlane.material.opacity = opacityIn
          self.toImagePlane.material.uniforms.opacity.value = opacityIn
          self.toImagePlane.material.needsUpdate = true;
        }
      })
      .start();

    crossFade.onComplete(function() {
      if (self.imagePlane) {
        self.imagePlane.material.dispose();
        self.imagePlane.geometry.dispose();
        self.scene.remove(self.imagePlane);
      }

      self.imagePlane = self.toImagePlane
      self.imagePlane.material.uniforms.opacity.value = 1;
      self.imagePlane.material.needsUpdate = true;
    })
  }

  nearestShot(position) {
    var self = this;
    var closestShot = null;
    var shortestDistance = Infinity;

    Object.keys(this.house.shots).forEach(function(shot_id){
      var shot = self.house.shots[shot_id];
      var cameraVector = self.opticalCenter(shot);
      var distance = position.distanceTo(cameraVector);
      if ( distance < shortestDistance ) {
        shortestDistance = distance;
        closestShot = shot_id;
      }
    });

    return {
      shotId: closestShot, distance: shortestDistance
    };

  }

  setHouse(house) {
    var self = this;
    this.house = house[0];
    this.camera.reconstruction = this.house;

    var cameras = new Object3D();

    Object.keys(this.house.shots).forEach( function(shot_id) {
      var shot = self.house.shots[shot_id];
      var cameraVector = self.opticalCenter(shot);
      var geometry = new SphereGeometry( .05, 16  );
      var material = new MeshBasicMaterial( { color: 'red' } );
      var camera   = new Mesh( geometry, material );
      camera.position.copy(cameraVector);
      cameras.add(camera);
    } );

    //self.scene.add(cameras);
  }

  loadRoom(shotId, successCb, failureCb, progressCb) {

    var self = this;

    this.camera.shot_id = shotId;
    var shot = this.camera.reconstruction.shots[this.camera.shot_id];
    var cam = this.camera.reconstruction.cameras[shot.camera];
    var position = this.opticalCenter(shot);

    if (!self.imagePlane) {
      self.camera.position.x = position.x;
      self.camera.position.y = position.y;
      self.camera.position.z = position.z;
    }

    this.toImagePlane = new Mesh();
    this.toImagePlaneLow = new Mesh();

    self.toImagePlane.material = this.createImagePlaneMaterial(cam, shot);
    self.toImagePlane.geometry = self.imagePlaneGeo(self.camera.reconstruction, self.camera.shot_id);


    self.toImagePlaneLow.geometry = self.imagePlaneGeo(self.camera.reconstruction, self.camera.shot_id);
    self.toImagePlaneLow.material = this.createImagePlaneMaterial(cam, shot);

    self.toImagePlane.geometry.computeBoundingBox();
    var center = self.toImagePlane.geometry.boundingBox.center();
    self.toImagePlaneLow.geometry.translate(-center.x, -center.y, -center.z);
    self.toImagePlaneLow.geometry.scale(1.1, 1.1, 1.1);

    this.loadPanoTiles(shotId, self.toImagePlane, function() {
      self.scene.add(self.toImagePlane);
      //self.scene.add(self.toImagePlaneLow);
      self.goto(position);
      self.camera.position.x = position.x;
      self.camera.position.y = position.y;
      self.camera.position.z = position.z;
    });

    //var wireframe = new WireframeHelper( this.imagePlane, 0x00ff00 );
    //this.scene.add(wireframe);

    this.toImagePlane.geometry.needsUpdate = true;
  }


  createImagePlaneMaterial(cam, shot) {

    var texture = new GridTexture( 256, 128, 16, 16 );


    var self = this;
    cam.width = 4096;
    cam.height = 2048;
    var material = new ShaderMaterial({
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        projectorMat: {
          type: 'm4',
          value: self.projectorCameraMatrix(cam, shot)
        },
        projectorTex: {
          type: 't',
          value: texture
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
      vertexShader: self.imageVertexShader(),
      fragmentShader: self.imageFragmentShader()
    });

    return material;

  }

  rotateVec(vector) {
    var axis = new Vector3( 1, 0, 0 );
    var angle = -Math.PI / 2;
    vector.applyAxisAngle( axis, angle );
    return vector;
  }

  tileURL(row, col, shotId) {
    return this.rootUrl + `/images/9999/tiles/${row}_${col}/${shotId}`;
  }
  imageURL(shotId) {
    return 'https://s3.amazonaws.com/htmlfusion-openhouse-formatted/images/9999/low/' + shotId;
  }

  opticalCenter(shot) {
    var angleaxis = [-shot.rotation[0],
      -shot.rotation[1],
      -shot.rotation[2]];
    var Rt = this.rotate(shot.translation, angleaxis);
    Rt.negate();
    return this.rotateVec(Rt);
  }


  imagePlaneGeo(reconstruction, shot_id) {
    var shot = reconstruction.shots[shot_id];
    var cam = reconstruction.cameras[shot.camera];

    if ('vertices' in shot) {
      var geometry = new Geometry();
      for (var i = 0; i < shot['vertices'].length; ++i) {
        geometry.vertices.push(
          this.rotateVec(new Vector3(
            shot['vertices'][i][0],
            shot['vertices'][i][1],
            shot['vertices'][i][2]
          ))
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
    var yUp = new Matrix4();
    yUp.set(
        1,  0,  0,  0,
        0,  0,  -1,  0,
        0,  1, 0,  0,
        0,  0,  0,  1
    );

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
    rotation.multiply(yUp);

    return rotation;
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


  loadPanoTiles(shotId, imageSphere, successCb) {
    var self = this;

    var loader = new TextureLoader();

    loader.setCrossOrigin("anonymous");

    //self.clearPano();

    loader.load(this.imageURL(shotId), function(texture) {
      self.toImagePlaneLow.material.uniforms.projectorTex.value = texture;
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

              var tile = self.tileURL(c, r, shotId);

              var patchTex = function ( tile, r, c) {
                return function(unitTexture) {
                  imageSphere.material.uniforms.projectorTex.value.patchTexture(unitTexture, (c-1)*256, (2048-(r-1)*128)-128);
                  imageSphere.material.needsUpdate = true;
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
    if (this.hoverShot) {
      this.loadRoom(this.hoverShot.shotId);
    }
  }

};

