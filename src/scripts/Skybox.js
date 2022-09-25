import { EventDispatcher,AxesHelper, SphereGeometry, PlaneGeometry, MeshPhongMaterial, BackSide, MeshBasicMaterial, ShaderMaterial, Mesh, TextureLoader, Color, DoubleSide } from 'three';
import { sRGBEncoding, GridHelper } from 'three';

export class Skybox extends EventDispatcher {
	constructor(scene, renderer, opts={}) {
		super();
		let options = {
			gridVisibility: true,
			groundArrowhelper: true
		};
		for (let opt in options) {
			if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
				options[opt] = opts[opt];
			}
		}
		this.defaultEnvironment = 'rooms/textures/envs/Garden.png';
		this.useEnvironment = false;
		this.topColor = 0x6BB78E; //0xe9e9e9; //0xf9f9f9;//0x565e63
		this.bottomColor = 0x5FA2E4; //0xD8ECF9
		this.verticalOffset = 400;
		this.exponent = 0.5;
		this.__options = options;
		var uniforms = { topColor: { type: 'c', value: new Color(this.topColor) }, bottomColor: { type: 'c', value: new Color(this.bottomColor) }, offset: { type: 'f', value: this.verticalOffset }, exponent: { type: 'f', value: this.exponent } };

		this.scene = scene;
		this.renderer = renderer;

		this.sphereRadius = 2000;
		this.widthSegments = 32;
		this.heightSegments = 15;
		this.sky = null;

		this.__fineGridFloor = null;
		this.__coarseGridFloor = null;

		this.__gridSize = 500;

		this.plainVertexShader = ['varying vec3 vWorldPosition;', 'void main() {', 'vec4 worldPosition = modelMatrix * vec4( position, 1.0 );', 'vWorldPosition = worldPosition.xyz;', 'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );', '}'].join('\n');
		this.plainFragmentShader = ['uniform vec3 bottomColor;', 'uniform vec3 topColor;', 'uniform float offset;', 'uniform float exponent;', 'varying vec3 vWorldPosition;', 'void main() {', ' float h = normalize( vWorldPosition + offset ).y;', ' gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max(h, 0.0 ), exponent ), 0.0 ) ), 1.0 );', '}'].join('\n');

		this.vertexShader = ['varying vec2 vUV;', 'void main() {', '  vUV=uv;', '  vec4 pos = vec4(position, 1.0);', '   gl_Position = projectionMatrix * modelViewMatrix * pos;', '}'].join('\n');
		this.fragmentShader = ['uniform sampler2D texture;', 'varying vec2 vUV;', 'void main() {  ', 'vec4 sample;', 'sample = texture2D(texture, vUV);', 'gl_FragColor = vec4(sample.xyz, sample.w);', '}'].join('\n');

		this.texture = new TextureLoader();
		this.plainSkyMat = new ShaderMaterial({ vertexShader: this.plainVertexShader, fragmentShader: this.plainFragmentShader, uniforms: uniforms, side: DoubleSide });
		this.plainSkyMat.name = 'PlainSkyMaterial';
		this.skyMat = undefined;

		this.skyGeo = new SphereGeometry(this.sphereRadius, this.widthSegments, this.heightSegments);
		this.sky = new Mesh(this.skyGeo, this.plainSkyMat);
		let axesHelper = new AxesHelper(1000);
		// this.scene.add(axesHelper);
		// this.scene.add(this.sky);

		this.__createGridFloors();
	}

	__createGridFloors() {
		let gridSpacing = 0.1;
		if (this.__fineGridFloor) {
			this.scene.remove(this.__fineGridFloor);
			this.scene.remove(this.__coarseGridFloor);
		}
		this.__fineGridFloor = new GridHelper(this.__gridSize, this.__gridSize * gridSpacing, 0x0FF000, 0xFF0000);
		this.__coarseGridFloor = new GridHelper(this.__gridSize, Math.round(this.__gridSize * (gridSpacing * 2)), 0x0F0F0F, 0x303030);

		if (this.__options.gridVisibility != undefined) {
			this.__fineGridFloor.visible = this.__options.gridVisibility;
			this.__coarseGridFloor.visible = this.__options.gridVisibility;
		}
		// this.scene.add(this.__coarseGridFloor);
		// this.scene.add(this.__fineGridFloor);

		this.scene.needsUpdate = true;
	}
}