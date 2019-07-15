const NORMALIZED_HEIGHT:number = 256;
const NORMALIZED_WIDTH:number = 224;
import * as Lib from "./pce";
//import romimage from "./testrom.pce";
    
type Rect = {
    x:number;
    y:number;
    w:number;
    h:number;
};

export default class Game {
    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;
    private height : number = window.innerHeight;
    private width : number = window.innerWidth;
    private ratio : number;
    private ticks:number;
    //    private image : HTMLImageElement;
    private screenbuffer:ImageData;
    private pce:Lib.System;
    static screenW = 256;
    static screenH = 224;
    static debug = false;
    private tempcanvas : HTMLCanvasElement;
    private tempctx : CanvasRenderingContext2D;
    
    private show_fps:boolean;
    static readonly FPS_INTERVAL = 30;
    private fpstime:number[];
    private fpsindex:number;
    static readonly COLOR_MODE_LIGHT = 0;
    static readonly COLOR_MODE_DARK = 0;
    private colormode:number;
    static readonly INFO_MODE_NONE = 0;
    static readonly INFO_MODE_DEBUG = 1;
    static readonly INFO_MODE_HELP = 2;
    private info_mode:number;
    
    
    constructor() {
	this.canvas = <HTMLCanvasElement> document.getElementById('canvas');
	this.ctx = this.canvas.getContext("2d");
	this.tempcanvas = <HTMLCanvasElement> document.getElementById('tempcanvas');
	this.tempctx = this.tempcanvas.getContext("2d");
	this.tempcanvas.width = Game.screenW;
	this.tempcanvas.height = Game.screenH;
	
	this.ctx.imageSmoothingEnabled = true;

	this.screenbuffer = this.ctx.createImageData(Game.screenW, Game.screenH);
	this.ratio = this.height / NORMALIZED_HEIGHT;
	this.ticks = 0;
	this.show_fps = false;
	this.colormode = Game.COLOR_MODE_LIGHT;
	this.info_mode = Game.INFO_MODE_NONE;
	this.fpstime = new Array<number>(Game.FPS_INTERVAL);
	this.fpstime.fill(0);
	this.fpsindex = 0;
	//	this.image = <HTMLImageElement> document.createElement('img');
	//	this.image.src = img;
	//this.info = new Image(284,440);
	
	this.init();
	this.gameinit();
	
	window.addEventListener("beforeunload", this.quit);
	window.addEventListener("resize", this.resize);
	window.addEventListener("drop", this.load);
	window.addEventListener("dragover", this.dragover);
	window.addEventListener("keyup", this.keyup);
	window.addEventListener("keydown", this.keydown);
	
    }
    
    init():void {
	this.width = window.innerWidth;
	this.height = window.innerHeight;
	this.canvas.width = this.width;
	this.canvas.height = this.height;
	if(this.width > this.height) {
	    this.ratio = this.height / NORMALIZED_HEIGHT;
	}else{
	    this.ratio = this.width / NORMALIZED_WIDTH;
	}
    }

    gameinit() {
	this.pce = new Lib.System();
    }
    
    // helper
    specfont(size:number, color:string):void{
	let fontsize = size * this.ratio;
	this.ctx.font = ""+fontsize+"px 'Consolas'";
	this.ctx.fillStyle = color;
    }
    drawtext(str:string, x:number, y:number):void {
	this.ctx.fillText(str, x*this.ratio, y*this.ratio);
    }

    public drawdebug(): void {

	//this.drawtext("hello" + this.ticks, 100, 100);
	if(!this.pce.is_ready()) {
	    this.specfont(12, 'black');
	    this.drawtext("drop pce rom image here", 50, 100);
	    this.specfont(6, 'black');
	    this.drawtext("[Keys]",50,120);
	    this.drawtext("F2:debug F8:fps",50,130);
	    this.drawtext("Z:I X:II C:RUN V:SEL Arrows:D-pad",50,140);
	}
	/*
	this.ctx.fillRect((165)*this.ratio,
			  (250)*this.ratio,
			  (70)*this.ratio,
			  (30)*this.ratio);
	*/
	if(this.pce.is_ready()){
	    
	    /*
	    for(let y = 0; y < 240; y ++) {
		for(let x = 0; x < 256; x ++) {
		    let c = this.pce.get_pixel(x+48, y+64);
		    if(c == undefined) {
			console.log("pixel access error "+x+"/"+y);
			this.pce.cpu.dump();
			this.pce.unload();
		    }
		    this.ctx.fillStyle = "rgb("+c.r+","+c.g+","+c.b+")";
		    this.ctx.fillRect(x * this.ratio,
				      y * this.ratio,
				      this.ratio,
				      this.ratio);
		}
	    }
	    */
	    
	    this.pce.fill_screen(0, 8, Game.screenW, Game.screenH, this.screenbuffer.data);
	    
	    //this.ctx.putImageData(this.screenbuffer,0,0,Game.screenW*this.ratio, Game.screenH*this.ratio);
	    this.tempctx.putImageData(this.screenbuffer,0,0);
	    this.ctx.drawImage(this.tempcanvas, 0, 0, Game.screenW * this.ratio, Game.screenH * this.ratio);
	    
	    
	}
	
	if(this.info_mode == Game.INFO_MODE_DEBUG) {
	    let s = (this.pce.cpu.dump_get_text()+"\n"+this.pce.gpu.dump_get_text() + "\n\n" + this.pce.psg.dump_get_text()).split("\n");
	    if(this.colormode == Game.COLOR_MODE_LIGHT) {
		this.specfont(6, 'lightgreen');
	    } else {
		this.specfont(6, 'darkgreen');
	    }
	    for(let i = 0; i < s.length; i ++) {
		this.ctx.fillText(s[i], 0*this.ratio, i*5*this.ratio);
	    }
	}
	if(this.show_fps) {
	    let now = 	this.fpstime[(this.fpsindex-1+Game.FPS_INTERVAL)%Game.FPS_INTERVAL];
	    let then = this.fpstime[this.fpsindex];
	    let duration = now - then;
	    let fps = Math.floor(Game.FPS_INTERVAL/(duration/1000));
	    if(isNaN(fps)) fps = 0;
	    if(this.colormode == Game.COLOR_MODE_LIGHT) {
		this.specfont(6, 'lightgreen');
	    } else {
		this.specfont(6, 'darkgreen');
	    }
	    this.ctx.fillText("FPS "+fps, 200*this.ratio, 10*this.ratio);
	}
    }
    
    /* main code */
    public process() : void {
	if(this.pce.is_ready()) {
	    this.pce.run(16.6666667);
	    //this.pce.cpu.step(10000);
	    //	    this.pce.cpu.dump();
	    //this.pce.unload();
	}
    }
    
    public render() : void {
	this.process();
	this.ticks ++;
	this.ctx.clearRect(0, 0, this.width, this.height);
	this.drawdebug();
	this.fpstime[this.fpsindex] = Date.now();
	this.fpsindex = ((this.fpsindex+ 1) % Game.FPS_INTERVAL);
    }

    public quit = (event:Event) : void => {
    }
	
    public resize = (event:Event) : void => {
	this.init();
    }

    public load = (event:DragEvent) : void => {
	event.preventDefault();
	event.stopPropagation();
	let file = event.dataTransfer.files[0];
	let reader = new FileReader();
	reader.onload = ()=>  {
	    let buf = reader.result as ArrayBuffer;
	    let ar = new Uint8Array(buf);
	    let romimage:number[] = Array.from(ar);
	    this.pce.load(romimage);
	};
	reader.readAsArrayBuffer(file);
	
    }
	
    public dragover = (event:DragEvent) : void => {
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
    }
	
    public keyup = (event:KeyboardEvent) : void => {
	if(event.key == "F2") {
	    if(this.info_mode != Game.INFO_MODE_DEBUG) {
		this.info_mode = Game.INFO_MODE_DEBUG;
	    } else {
		this.info_mode = Game.INFO_MODE_NONE;
	    }
	}
	
	if(event.key == "F8") {
	    this.show_fps = !this.show_fps;
	}

	if(event.key == "F9") {
	    if(this.colormode == Game.COLOR_MODE_LIGHT) {
		this.colormode = Game.COLOR_MODE_DARK;
	    }else {
		this.colormode = Game.COLOR_MODE_LIGHT;
	    }
	}

	if(event.key == "ArrowLeft") this.pce.gamepad_LEFT_off();
	if(event.key == "ArrowRight") this.pce.gamepad_RIGHT_off();
	if(event.key == "ArrowUp") this.pce.gamepad_UP_off();
	if(event.key == "ArrowDown") this.pce.gamepad_DOWN_off();
	if(event.key == "z") this.pce.gamepad_A_off();
	if(event.key == "x") this.pce.gamepad_B_off();
	if(event.key == "c") this.pce.gamepad_START_off();
	if(event.key == "v") this.pce.gamepad_SELECT_off();
	
    }
	
    public keydown = (event:KeyboardEvent) : void => {
	if(event.key == "ArrowLeft") this.pce.gamepad_LEFT_on();
	if(event.key == "ArrowRight") this.pce.gamepad_RIGHT_on();
	if(event.key == "ArrowUp") this.pce.gamepad_UP_on();
	if(event.key == "ArrowDown") this.pce.gamepad_DOWN_on();
	if(event.key == "z") this.pce.gamepad_A_on();
	if(event.key == "x") this.pce.gamepad_B_on();
	if(event.key == "c") this.pce.gamepad_START_on();
	if(event.key == "v") this.pce.gamepad_SELECT_on();
    }
	
}
