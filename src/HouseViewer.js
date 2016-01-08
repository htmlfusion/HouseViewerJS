import { Scene, WebGLRenderer, PerspectiveCamera } from 'three.js';
import VRControls from './VRControls';
import VREffect from './VREffect';

export default class {
  init(element) {
    var renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    // Append the canvas element created by the renderer to document body element.
    element.appendChild(renderer.domElement);
    // Create a three.js scene.
    var scene = new Scene();
    // Create a three.js camera.
    var camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

    // Apply VR headset positional data to camera.
    var controls = new VRControls(camera);

    // Apply VR stereo rendering to renderer.
    var effect = new VREffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);
    console.log(scene);
    return 'hello';
  }
};

