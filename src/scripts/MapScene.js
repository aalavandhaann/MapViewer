import gsap from "gsap";
import { ACESFilmicToneMapping, AmbientLight, AxesHelper, CameraHelper, CineonToneMapping, Color, DirectionalLight, DirectionalLightHelper, GridHelper, HemisphereLight, LinearToneMapping, PCFSoftShadowMap, PerspectiveCamera, Raycaster, ReinhardToneMapping, Scene, sRGBEncoding, Vector2, Vector3, WebGLRenderer } from "three";
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass';
import {AfterimagePass} from 'three/examples/jsm/postprocessing/AfterimagePass';
import Stats from 'stats.js';


import { MapLoader } from "./MapLoader";
import { Skybox } from "./Skybox";



export const ATOMSIZE = 4;
export const NORMALSIZE = 1;
export const BOUNDS = new Vector3(20, 20, 20);
export const EVENT_DESTROYED = 'DESTROYED_EVENT';
export const EVENT_COLLISION = 'COLLISION_EVENT';

export class MapScene extends Scene {
    constructor(elementID){
        super();
        this.__domID = (elementID) ? elementID : "map-scene";
        this.__domElement = document.getElementById(this.__domID);
        this.__domInfoId = null;
        this.__domInfoElement = null;

        if(!this.__domElement){
            this.__domElement = document.createElement("DIV");
            this.__domElement.setAttribute("id", this.__domID);
            document.getElementsByTagName('BODY')[0].append(this.__domElement);
        }

        this.__prevTime = 0;
        this.__camera = null;
        this.__renderer = null;
        this.__composer = null;
        this.__controls = null;
        this.__ambientLight = null;
        this.__hemisphereLight = null;
        this.__skybox = null;
        this.__axes = null;
        this.__renderScene = true;
        this.__mapLoader = null;
        this.__cameraRestPosition = new Vector3(-20, 150, 200);
        this.__cameraTargetPosition = new Vector3(50, 0, 50);

        this.__stats = new Stats();
        document.body.appendChild(this.__stats.dom);

        this.__initialize();

        
    }

    __initialize(){
        let cameraNear = 1;
        let cameraFar = 1000;
        this.__outlinepass = null;
        this.__camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, cameraNear, cameraFar);
        this.__renderer = this.__getRenderer();
        this.__composer = this.__getComposer();
        
        this.__axes = new AxesHelper(BOUNDS.x);
        this.__grid = new GridHelper(500, 10);
        this.__controls = new OrbitControls(this.__camera, this.__domElement);
        this.__mapLoader = new MapLoader();
        this.__controls.enableDamping = true;
        this.__controls.dampingFactor = 0.5;
        this.__controls.minDistance = 4;
        this.__controls.screenSpacePanning = true;
        this.__controls.autoRotate = true;
        this.__controls.autoRotateSpeed  = 0.1;
        
        this.__camera.position.copy(this.__cameraRestPosition);
        this.__controls.target.copy(this.__cameraTargetPosition.clone());
        this.__controls.update();

        // this.add(this.__grid);
        // this.add(this.__axes);
        this.add(this.__mapLoader);

        this.__addLights();
        this.__domElement.appendChild(this.__renderer.domElement);
        this.__renderer.setAnimationLoop(this.__render.bind(this));

        window.addEventListener('resize', this.__updateSize.bind(this));
        window.addEventListener('orientationchange', this.__updateSize.bind(this));
        window.addEventListener('click', this.__infoWindow.bind(this));

        this.__updateSize();
    }

    __setCameraPosition(province){
        let cameraDuration = 1.0;
        let targetDuration = 1.0;
        let elevation = 120.0;
        let cameraPosition = new Vector3();
        let targetPosition = new Vector3();
        let scope = this;
        (province) ? province.getWorldPosition(targetPosition) : this.__cameraTargetPosition.clone();

        cameraPosition = (province) ? targetPosition.clone() : this.__cameraRestPosition.clone();
        cameraPosition.y = elevation;

        targetPosition.x += 10;
        targetPosition.z += 10;

        function onUpdate(){
            scope.__controls.update();
        }

        function onTargetComplete(){
        }

        function onCameraComplete(){
            scope.__controls.update();
        }       
        
        gsap.to(scope.__camera.position, { 
            duration: cameraDuration, 
            x: cameraPosition.x, 
            y: cameraPosition.y, 
            z: cameraPosition.z, 
            onUpdate: onUpdate, 
            onComplete: onCameraComplete  
        });

        gsap.to(scope.__controls.target, { 
            duration: targetDuration, 
            x: targetPosition.x, 
            y: targetPosition.y, 
            z: targetPosition.z,
            onUpdate: onUpdate,
            onComplete: onTargetComplete  
        });
    }

    __infoWindow(evt){
        if(!this.__domInfoElement){
            return;
        }
        let province = null;
        let intersectResults = null;
        let size = this.__getSize();
        let raycaster = new Raycaster();
        let mouse = new Vector3(0, 0, 0.5);
        let message = null;
        mouse.x = ((evt.clientX / size.x) * 2) - 1;
        mouse.y = (-(evt.clientY / size.y) * 2) + 1;
        raycaster.setFromCamera(mouse, this.__camera);
        intersectResults = raycaster.intersectObjects(this.__mapLoader.provinces, false);
        if(intersectResults.length){
            if(this.__mapLoader.currentProvince !== intersectResults[0].object){
                province = intersectResults[0].object; 
                this.__outlinepass.selectedObjects = [province];                
            }
        }
        message = (province) ? `Current Province: ${province.name}<br>(Vivek Kattuva Qatar Map Demo)` : '';
        this.__domInfoElement.innerHTML = message;
        this.__setCameraPosition(province);
        this.__mapLoader.__reset();
        if(province){
            this.__mapLoader.__animatedProvince(province, 5.0, 1.0);
        }        
    }    
    __addLights(){
        let hemiLight = new HemisphereLight(0xFFFFFF, 0x999999, 0.5);
        let ambiLight = new AmbientLight(0xFFFFFF);
        let directionLight = new DirectionalLight(0xF5AF19, 1.0);
        let cloudsDirectionLight = new DirectionalLight(0xF5AF19, 0.5);

        let directionLightHelper = new DirectionalLightHelper(directionLight);
        let cloudsDirectionLightHelper = new DirectionalLightHelper(cloudsDirectionLight);

        const d = 90;
        const cloudsD = 150;
        // this.__skybox = new Skybox(this, this.__renderer);

        ambiLight.intensity = 0.15;
        hemiLight.position.set(0, 1000, 0);

        directionLight.position.set(73, 103, 0);
        directionLight.target.position.set(-24, 0, 0);

        directionLight.shadow.camera.left = -d;
        directionLight.shadow.camera.right = d;
        directionLight.shadow.camera.top = d;
        directionLight.shadow.camera.bottom = -d;

        cloudsDirectionLight.position.set(10, 200, 10);
        cloudsDirectionLight.target.position.set(10, 10, 10);

        cloudsDirectionLight.shadow.camera.left = -cloudsD;
        cloudsDirectionLight.shadow.camera.right = cloudsD;
        cloudsDirectionLight.shadow.camera.top = cloudsD;
        cloudsDirectionLight.shadow.camera.bottom = -cloudsD;

        this.__hemisphereLight = hemiLight;
        this.__ambientLight = ambiLight;

        directionLight.castShadow = true;
        cloudsDirectionLight.castShadow = true;

        this.add(hemiLight);
        this.add(ambiLight);

        this.add(directionLight);
        // this.add(directionLight.target);
        // this.add(directionLightHelper);
        // this.add( new CameraHelper( directionLight.shadow.camera ) );

        this.add(cloudsDirectionLight);
        // this.add(cloudsDirectionLight.target);
        // this.add(cloudsDirectionLightHelper);
        // this.add( new CameraHelper( cloudsDirectionLight.shadow.camera ) );

    }

    __getComposer(){
        let composer = new EffectComposer(this.__renderer);
        let renderPass = new RenderPass(this, this.__camera);
        let ssaoPass = new SSAOPass(this, this.__camera, window.innerWidth, window.innerHeight);
        let outlinePass = new OutlinePass(new Vector2(window.innerWidth, window.innerHeight), this, this.__camera);
        let bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        let afterImagePass = new AfterimagePass();

        ssaoPass.kernelRadius = 16;
        bloomPass.threshold = 0;
        bloomPass.strength = 0.25;
        bloomPass.radius = 0;

        outlinePass.visibleEdgeColor.set('#ffffff');
		outlinePass.hiddenEdgeColor.set('#190a05');
        outlinePass.edgeStrength = 10.0;

        // afterImagePass.uniforms['damp'] = 0.9;

        composer.addPass(renderPass);
        // composer.addPass(ssaoPass);
        // composer.addPass(bloomPass);
        // composer.addPass(outlinePass);
        // composer.addPass(afterImagePass);

        this.__outlinepass = outlinePass;
        return composer;
    }

    __getRenderer(){
        let renderer = new WebGLRenderer({antialias: true, alpha: true});
        renderer.shadowMap.enabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        renderer.outputEncoding = sRGBEncoding;
        renderer.toneMapping = LinearToneMapping;
        
        renderer.shadowCameraFar = this.__camera.far;

        renderer.setClearColor(0xFFFFFF, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
    }

    __getSize(){
        let heightMargin = this.__domElement.offsetTop;
        let widthMargin = this.__domElement.offsetLeft;
        let elementWidth = window.innerWidth - widthMargin;
        let elementHeight = window.innerHeight - heightMargin;

        return new Vector2(elementWidth, elementHeight);
    }

    __updateSize(){
        
        let size = this.__getSize();
        this.__camera.aspect = size.x / size.y;
        this.__camera.updateProjectionMatrix();
        this.__renderer.setSize(size.x, size.y);
        this.__composer.setSize(size.x, size.y);
    }

    __render(time){
        this.__stats.begin();
        this.__prevTime = time;
        this.__controls.update();
        if(!this.__renderScene){            
            // this.__renderer.render(this, this.__camera);   
            this.__composer.render();         
        }
        else{
            // this.__renderer.render(this, this.__camera);        
            this.__composer.render();
        }
        this.__mapLoader.animationLoops(time);
        this.__stats.end();
    }

    get domInfoId(){
        return this.__domInfoId;
    }

    set domInfoId(id){
        this.__domInfoId = id;
        this.__domInfoElement = document.getElementById(id);
    }
}