import gsap from "gsap";
import { Color, LineSegments, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, MeshToonMaterial, Vector3, WireframeGeometry } from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

export class MapLoader extends Mesh{
    constructor(mapModelURL=undefined){
        super();
        this.__modelURL = (mapModelURL) ? mapModelURL : 'models/quatar-map.glb';
        this.__content = null;
        this.__provinces = null;
        this.__currentProvince = null;
        this.__originalPositions = null;
        this.__originalColors = null;
        this.__cloudsHolder = null;
        this.__gltfLoader = new GLTFLoader();        
        this.__startTime = null;
        this.__initialize();
    }

    __initialize(){
        this.__gltfLoader.load(this.__modelURL, this.__loaded.bind(this));
    }

    __loaded(gltf){
        const scene = gltf.scene || gtlf.scenes[0];
        this.__content = scene;
        this.__provinces = [];
        this.__originalPositions = [];
        this.__originalColors = [];
        scene.traverse((province) =>{
            province.castShadow = true;
            province.receiveShadow = true;
            if(province.isMesh){
                let color = province.material.color.clone();
                province.material = new MeshPhysicalMaterial({color: color, roughness: 0.5, transparent: true, opacity: 1.0});
                if(province.name.includes('Province_')){
                    this.__originalPositions.push(province.position.clone());
                    this.__originalColors.push(color);
                    this.__provinces.push(province);
                }   
                if(province.name.includes('CloudsHolder')){
                    this.__cloudsHolder = province;
                }             
            }
        });
        this.add(this.__content);
    }

    __reset(){
        let index = 0;
        let duration = 0.25;
        let scale = 1.0;
        // this.__animatedProvince(this.__currentProvince, 0.0, 1.0);
        this.__currentProvince = null;
        this.__provinces.forEach((otherProvince)=>{
            let newPosition = this.__originalPositions[index];
            gsap.to(otherProvince.position, { duration: duration, x: newPosition.x });
            gsap.to(otherProvince.position, { duration: duration, y: newPosition.y });
            gsap.to(otherProvince.position, { duration: duration, z: newPosition.z });
            gsap.to(otherProvince.scale, { duration: duration, x: scale });
            gsap.to(otherProvince.scale, { duration: duration, y: scale });
            gsap.to(otherProvince.scale, { duration: duration, z: scale });
            otherProvince.material.color = this.__originalColors[index];
            index++;
        });
    }

    __animatedProvince(province=null, positionY=0.0, scale = 1.0){
        let duration = 0.25;
        let scalar = 1.05;
        let a = new Vector3();
        let b = new Vector3(1, 0, 0);
        if(province){
            for(let index = 0;index<this.__originalPositions.length;index++){
                let otherProvince = this.__provinces[index];
                let originalPosition = this.__originalPositions[index];
                let vector = originalPosition.clone().sub(province.position);
                let newPosition = province.position.clone().add(vector.multiplyScalar(scalar));
                if(province === otherProvince){
                    continue;
                }     
                gsap.to(otherProvince.position, { duration: duration, x: newPosition.x });
                gsap.to(otherProvince.position, { duration: duration, y: newPosition.y });
                gsap.to(otherProvince.position, { duration: duration, z: newPosition.z });
                otherProvince.material.color = new Color(0xA3A3E3);
            }
        }
        
        if(province){
            // let c = new Color();
            // c.setHSL(0.7, 0.5, 0.7);
            gsap.to(province.position, { duration: duration, y: positionY });
            gsap.to(province.scale, { duration: duration, x: scale });
            gsap.to(province.scale, { duration: duration, y: scale });
            gsap.to(province.scale, { duration: duration, z: scale });
            // province.material.color = c;
            this.__currentProvince = province;           
        }
    }

    animationLoops(time){
        if(!this.__startTime){
            this.__startTime = time;
        }
        if(this.cloudsHolder){
            let delta = (time - this.__startTime) / 10000;
            this.cloudsHolder.rotation.y += 0.0002;
            this.cloudsHolder.position.x = Math.sin(delta) * 50;
        }
    }

    get currentProvince(){
        return this.__currentProvince;
    }

    get provinces(){
        return this.__provinces;
    }

    get cloudsHolder(){
        return this.__cloudsHolder;
    }
}