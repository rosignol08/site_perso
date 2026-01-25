//fusil simple qui tire quand on lui demande
import * as THREE from 'three';

class Fusil {
    constructor(soltat,) {
        this.il_tire = false; //si il est entrain de tier ou pas
        this.refroidissement = 0.5;
    }
    tire(oui, deltatime){
        if(oui && this.il_tire == false){
            //on peut tirer
            this.refroidissement = 0.5;
            this.il_tire = true;
        }else{
            this.refroidissement -= deltatime;
        }
        if(this.refroidissement <= 0){
            this.il_tire = false;
        }
    }
}