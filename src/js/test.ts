import * as Lib from './pce';

const fs = require('fs');
let romdata:number[] = fs.readFileSync("testrom.pce");
/*
console.log(romdata.length);
console.log(Util.hex(romdata[0x2200-1]));
let m = new MemoryController();
m.attach_rom(romdata);
console.log(m.memdump_get_text(0xff00, 256));
*/

Lib.Timer.debug = false;
Lib.GamePad.debug = false;
Lib.InterruptMask.debug = false;
Lib.Pal.debug = false;
Lib.GPU.debug = false;
Lib.PSG.debug = false;
Lib.CPU.debug = false;


let sys = new Lib.System();


sys.load(romdata);
let start_time = new Date().getTime();
sys.cpu.reset();
sys.cpu.dump();
sys.cpu.findopcode = 0xf4;//SET
//sys.cpu.findopcode = 0x70;//BVS
sys.cpu.findoccurmax = 1;
//c.breakaddr = 0xe04e;
//c.breakaddr = 0x9079;
sys.cpu.breakaddr = 0xd9f3;
sys.cpu.breakleft = 2000;
Lib.CPU.debugbreak = false;

//sys.cpu.debugstartticks = 954540;
Lib.CPU.debugfind = false;
sys.cpu.debugticksenable = false;
//let step = 954541+3000;
let step = 5000000;
sys.cpu.step(step);
sys.gamepad_START_on();
step = 79000;
sys.cpu.step(step);
sys.gamepad_START_off();

step = 10000;
sys.cpu.step(step);

Lib.InterruptMask.debug = true;
Lib.CPU.debug = true;
Lib.GPU.debug = true;

step = 10000;
sys.cpu.step(step);

let elapsed = new Date().getTime() - start_time; // ms
//sys.cpu.step(Math.floor(Lib.System.BASE_CLOCK*2)*30+1000);
//sys.cpu.step(10000);
//sys.run(16.7 *2000);

for(let y = 0; y < 100; y ++) {
    for(let x = 0; x < 100; x ++) {
	let c = sys.get_pixel(x, y);
	if(c == undefined) {
	    console.log("repro "+x+"/"+y);
	}
    }
}
sys.cpu.dump();
let realtime = 1000 * step / (Lib.System.BASE_CLOCK * 2); // ms
console.log("Realtime "+realtime+" processtime " + elapsed + " ratio "+realtime/elapsed);

sys.cpu.show_profile();
