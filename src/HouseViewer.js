import { Scene, WebGLRenderer, PerspectiveCamera, SphereGeometry, MeshBasicMaterial, Mesh } from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';
import WebVRManager from './WebVRManager';

export default class {
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

    function animate(timestamp) {
      // Update VR headset position and apply to camera.
      controls.update();
      // Render the scene through the manager.
      manager.render(self.scene, camera, timestamp);
      requestAnimationFrame(animate);
    }

    // Kick off animation loop
    animate();

    return 'hello';
  }

  sample() {
    var geometry = new SphereGeometry( 500, 60, 40 );
    geometry.scale( - 1, 1, 1 );

    var material = new MeshBasicMaterial( {
      map: ImageUtils.loadTexture( '/example/imgs/office.jpg' )
    } );

    mesh = new Mesh( geometry, material );

    this.scene.add( mesh );
  }
};

