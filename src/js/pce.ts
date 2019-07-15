


export class Log {
    
    static error:string;
    
    constructor () {
	Log.error = "";
    }
    
    static d(text:string) {
	Log.error += text;
    }
}

export class Util {
    static hex(num:number, dig:number = 2):string {
	return ("00000000" + num.toString(16)).slice(-dig);
    }
}


export class ROM {
    static readonly DEFAULT_HEADERSIZE = 0x200;
    offset:number;
    memory:number[];
    isAttached:boolean;
    error:boolean;
    errorLog:string;
    
    constructor() {
	this.error = false;
	this.errorLog = "";
	this.memory = null;
	this.offset = ROM.DEFAULT_HEADERSIZE;
    }
    
    read(addr:number):number {
	if(!this.memory) {
	    this.errorLog += "ROM not loaded\n";
	    return 0;
	}
	return this.memory[addr + this.offset];
    }
    
    write(addr:number, value:number) {
	if(!this.memory) {
	    this.errorLog += "ROM not loaded\n";
	    return;
	}
	this.errorLog += "Error writing ROM " + value + " at " + addr + "\n";
	this.error = true;
    }
    
    
    length():number {
	if(this.memory == null) return 0;
	return this.memory.length;
    }

    attach(image:number[]) {
	this.memory = image;
	this.offset = this.length() & 0xfff;
    }
}


export class RAM {
    static readonly DEFAULTSIZE = 0x2000;
    size:number;
    memory:number[];
    isBackup:boolean;
    error:boolean;
    errorLog:string;
    
    constructor(size:number = RAM.DEFAULTSIZE) {
	this.size = size;
	this.memory = new Array<number>(size);
	this.memory.fill(0);
	this.error = false;
	this.errorLog = "";
    }
    
    read(addr:number):number {
	//	console.log("read ram "+Util.hex(addr,4));
	return this.memory[addr];
    }
    
    write(addr:number, value:number) {
	this.memory[addr] = value;
    }

    length():number {
	return this.memory.length;
    }
}

export class Timer {
    static debug:boolean = false;
    counter:number;
    countermax:number;
    period:number;
    enable:number;
    interrupt:boolean;
    constructor() {
	this.period = 0;
	this.enable = 0;
	this.counter = 0;
	this.countermax = 0;
	this.interrupt = false;
    }
    read(addr:number):number {
	let decode:string = "[Timer] read @"+addr+ " ";
	switch(addr) {
	case 0: 
	    return this.period;
	    break;
	case 1:
	    return this.enable;
	    break;
	}
	if(Timer.debug) {
	    console.log(decode);
	}
    }
    write(addr:number, value:number) {
	let decode:string = "[Timer] write @"+addr+ " ";
	switch(addr) {
	case 0: 
	    this.period = value & 0x7f;
	    decode += "period="+this.period;
	    this.countermax = 1023 * this.period;
	    if(this.countermax == 0) this.countermax = 1023;
	    break;
	case 1:
	    this.enable = value & 0x01;
	    decode += "enable="+this.enable;
	    break;
	}
	if(Timer.debug) {
	    console.log(decode);
	}
    }
    
    exec(clock:number = 1) {
	if(this.enable == 0) return;
	this.counter = this.counter + clock;
	if(this.counter > this.countermax) {
	    this.counter = this.counter - this.countermax;
	    this.interrupt = true;
	}
    }
    
}

export class GamePadButton {
    A:number;
    B:number;
    START:number;
    SELECT:number;
    UP:number;
    DOWN:number;
    LEFT:number;
    RIGHT:number;
    static PAD_ON = 0;
    static PAD_OFF = 1;
    constructor() {
	this.A = GamePadButton.PAD_OFF;
	this.B = GamePadButton.PAD_OFF;
	this.START = GamePadButton.PAD_OFF
	this.SELECT = GamePadButton.PAD_OFF;
	this.UP = GamePadButton.PAD_OFF;
	this.DOWN = GamePadButton.PAD_OFF;
	this.LEFT = GamePadButton.PAD_OFF;
	this.RIGHT = GamePadButton.PAD_OFF;
    }
}

export class GamePad {
    static readonly MAX_PLAYER = 4;
    static debug:boolean = false;
    player:GamePadButton[];
    playersel:number;
    buttonsel:number;
    constructor() {
	this.player = new Array<GamePadButton>(GamePad.MAX_PLAYER);
	for(let i = 0; i < GamePad.MAX_PLAYER; i ++) {
	    this.player[i] = new GamePadButton();
	}
	this.playersel = 0;
	this.buttonsel = 0;
    }
    read(addr:number):number {
	if(this.buttonsel == 0) {
	    let A = this.player[this.playersel].A;
	    let B = this.player[this.playersel].B;
	    let START = this.player[this.playersel].START;
	    let SELECT = this.player[this.playersel].SELECT;
	    let ret = ((A<<1)|(B)|(START<<3)|(SELECT<<2))&0xff;
	    return ret;
	} else {
	    let UP = this.player[this.playersel].UP;
	    let DOWN = this.player[this.playersel].DOWN;
	    let LEFT = this.player[this.playersel].LEFT;
	    let RIGHT = this.player[this.playersel].RIGHT;
	    let ret = ((UP)|(DOWN<<2)|(LEFT<<3)|(RIGHT<<1))&0xff;
	    return ret;
	}
	if(GamePad.debug) console.log("[GamePad] read "+Util.hex(addr));
	return 0;
    }
    write(addr:number, value:number) {

	this.buttonsel = value & 0x01;
	
	if(GamePad.debug) console.log("[GamePad] write "+Util.hex(addr)+":"+Util.hex(value));
	return;
    }
}

export class InterruptMask {
    static debug:boolean = false;
    irq2:number;
    irq1:number;
    timer:number;
    irq2pend:number;
    irq1pend:number;
    timerpend:number;

    constructor () {
	this.irq2 = 0;
	this.irq1 = 0;
	this.timer = 0;
	this.irq2pend = 0;
	this.irq1pend = 0;
	this.timerpend = 0;
    }
    read(addr:number):number {
	let v = 0;
	let decode:string = "[Interrupt Mask] read @"+addr+ " ";
	switch(addr) {
	case 2: // control
	    v = this.irq2|(this.irq1<<1)|(this.timer<<2);
	    return v;
	    break;
	case 3: // status
	    v = this.irq2pend|(this.irq1pend<<1)|(this.timerpend<<2);
	    return v;
	    break;
	}
    }
    write(addr:number, value:number) {
	let decode:string = "[Interrupt Mask] write @"+addr+ " ";
	switch(addr) {
	case 2: // control
	    this.irq2 = value & 0x1;
	    this.irq1 = (value & 0x2)>>1;
	    this.timer = (value & 0x4)>>2;
	    decode += "irq2="+this.irq2+" irq1="+this.irq1+" timer="+this.timer;
	    break;
	case 3: // status
	    break;
	}
	if(InterruptMask.debug) {
	    console.log(decode);
	}
    }
}


export class Color {
    r:number;
    g:number;
    b:number;

    constructor() {
	this.r = 0;
	this.g = 0;
	this.b = 0;

    }
    set(r:number, g:number, b:number) {
	this.r = r;
	this.g = g;
	this.b = b;
	//	this.packed = (r<<24)|(g<<16)|b;
    }
    get_text():string {
	return "R"+this.r+" G"+this.g+" B"+this.b;
    }
};


export class Pal {
    static readonly PALETTE_SIZE = 512;
    static debug:boolean = false;
    palette:Color[];
    addrh:number;
    addrl:number;
    colorh:number;
    colorl:number;
    colorburst:number;
    filter:number;
    freq:number;
    addr:number;
    
    constructor() {
	this.palette = new Array<Color>(Pal.PALETTE_SIZE);
	this.reset();
    }

    reset() {
	this.addrh = 0;
	this.addrl = 0;
	this.colorh = 0;
	this.colorl = 0;
	this.addr = 0;
	for(let i = 0; i < Pal.PALETTE_SIZE; i ++) {
	    this.palette[i] = new Color();
	}
    }
    
    read(addr:number):number {
	// illgal access
	return 0;
    }

    write(addr:number, value:number) {
	switch(addr) {
	case 0: // reset
	    if(value == 0) this.reset();
	    this.colorburst = (value & 0x8)>>7;
	    this.filter = (value & 0x4) >> 2;
	    this.freq = (value & 0x03);
	    if(Pal.debug){
	    console.log("[Pal] burst " + this.colorburst +
			" filter " + this.filter +
			" freq " + this.freq
			);
	    }
	    break;
	case 2: // entry low
	    this.addrl = value;
	    this.addr = ((this.addrh<<8)|this.addrl) & 0x1ff;
	    break;
	case 3: // entry high
	    this.addrh = value;
	    this.addr = ((this.addrh<<8)|this.addrl) & 0x1ff;
	    break;
	case 4: // color low GGRRRBBB
	    this.colorl = value;
	    break;
	case 5: // color high xxxxxxxG
	    this.colorh = value;
	    let r = ((this.colorl & 0x38)>>3)<<5;
	    let g = (((this.colorh & 0x1) << 2)|((this.colorl & 0xc0)>>6))<<5;
	    let b = (this.colorl & 0x7)<<5;
	    this.palette[this.addr].set(r, g, b);
	    
	    if(Pal.debug) {
		console.log("[Pal] writing "+this.palette[this.addr].get_text() + " @"+this.addr);
	    }
	    
	    this.addr = (this.addr + 1) & 0x1ff;;

	    break;
	default: // illegal access
	    break;
	}
	return;
    }

    get_color(index:number):Color {
	return this.palette[index];
    }
}

export class Sprite {
    ypos:number;
    xpos:number;
    saddr:number;
    yflip:number;
    xflip:number;
    ysize:number;
    xsize:number;
    fg:number;
    pal:number;
    
    constructor() {
	this.ypos = 0;
	this.xpos = 0;
	this.saddr = 0;
	this.yflip = 0;
	this.xflip = 0;
	this.ysize = 0;
	this.xsize = 0;
	this.fg = 0;
	this.pal = 0;
    }
}

export class GPU {
    static readonly VRAM_SIZE = 32*1024; // 32K word 16bit
    static readonly PALBITMAP_W = 1024;
    static readonly PALBITMAP_H = 512; // pixel
    static readonly PALBITMAP_SIZE = GPU.PALBITMAP_W * GPU.PALBITMAP_H;
    static readonly SPRITE_SIZE = 64;
    static readonly FRAME_SKIP = 0;
   
    static debug = false;
    vram_raddr:number;
    vram_waddr:number;
    vram_value:number;
    iaddr:number; // reg0
    status_dma_inprogrss:number; // reg0 read
    status_vblank:number;
    status_vdma_complete:number;
    status_satb_dma_complete:number;
    status_hblank:number;
    status_sprite_overflow:number;
    status_sprite0_collision:number;
    datal:number; // reg1
    datah:number; // reg2
    control_incr:number; // reg5 bit12-11
    control_bg_enable:number; // reg5 bit7
    control_sprite_enable:number; // reg5 bit6
    control_int_vblank:number; // reg5 bit3-0
    control_int_hblank:number;
    control_int_sprite_overflow:number;
    control_int_sprite0_collision:number;
    rcr:number; // reg6 interrupt scanline position
    bxr:number; // reg7 bat x
    byr:number; // reg8 bat y
    mwr_size_w:number; // reg9 bit6-4 bat size
    mwr_size_h:number;
    hsr_start:number; // reg10
    hsr_width:number;
    hdr_end:number; // reg 11
    hdr_width:number;
    vpr_start:number; // reg 12
    vpr_width:number; // reg 12
    vdw_width:number; // reg 13
    vcr_width:number; // reg 14
    dcr_satb_auto:number; // reg15 bit4
    dcr_vdma_dest_dec:number; // reg15 bit3
    dcr_vdma_src_dec:number; // reg15 bit2
    dcr_vdma_complete:number; // reg15 bit1
    dcr_satb_dma_complete:number; // reg15 bit0
    dma_src:number; // reg16
    dma_dest:number; // reg17
    dma_len:number; // reg18
    satb_addr:number = 0; // SATB start address

    latchl:number[];
    latchh:number[];
    
    memory:number[]; // vram
    bitmap:number[]; // palette bitmap for upper layer

    sprites:Sprite[];
    vsync_counter:number;
    vsync_interrupt:boolean;
    debug_vsync_called:number;

    skip_left:number;

    
    constructor() {
	this.memory = new Array<number>(GPU.VRAM_SIZE);
	this.memory.fill(0);
	this.bitmap = new Array<number>(GPU.PALBITMAP_SIZE);
	this.bitmap.fill(0);
	
	this.sprites = new Array<Sprite>(GPU.SPRITE_SIZE);
	for(let i = 0; i < GPU.SPRITE_SIZE; i ++) {
	    this.sprites[i] = new Sprite();
	}

	
	this.vram_raddr = 0;
	this.vram_waddr = 0;
	this.vram_value = 0;
	this.iaddr = 0;
	this.status_dma_inprogrss = 0;
	this.status_vblank = 0;
	this.status_vdma_complete = 0;
	this.status_satb_dma_complete = 0;
	this.status_hblank = 0;
	this.status_sprite_overflow = 0;
	this.status_sprite0_collision = 0;
	this.datal = 0;
	this.datah = 0;
	this.control_incr = 0;
	this.control_bg_enable = 0;
	this.control_sprite_enable = 0;
	this.control_int_vblank = 0;
	this.control_int_hblank = 0;
	this.control_int_sprite_overflow = 0;
	this.control_int_sprite0_collision = 0;
	this.rcr = 0;
	this.bxr = 0;
	this.byr = 0;
	this.mwr_size_w = 0;
	this.mwr_size_h = 0;
	this.hsr_start = 0;
	this.hsr_width= 0;
	this.hdr_end= 0;
	this.hdr_width = 0;
	this.vpr_start = 0;
	this.vpr_width = 0;
	this.vdw_width = 0;
	this.vcr_width = 0;
	this.dcr_satb_auto = 0;
	this.dcr_vdma_dest_dec = 0;
	this.dcr_vdma_src_dec = 0;
	this.dcr_vdma_complete = 0;
	this.dcr_satb_dma_complete = 0;
	this.dma_src = 0;
	this.dma_dest = 0;
	this.dma_len = 0;
	this.satb_addr = 0;
	this.vsync_counter = 0;
	this.vsync_interrupt = false;
	this.debug_vsync_called = 0;

	this.latchl = new Array<number>(20); // msb latch for each reg
	this.latchl.fill(0);
	this.latchh = new Array<number>(20); // msb latch for each reg
	this.latchh.fill(0);

	this.skip_left = 0;
    }

    dump_get_text():string {
	let ret = "GPU\n" +
	    "RCR " + ("    " + this.rcr).slice(-4) +
	    " BXR " + ("    " + this.bxr).slice(-4) +
	    " BYR " + ("    " + this.byr).slice(-4) +
	    " MWR " + ("    " + this.mwr_size_w).slice(-4) +
	    "x" + ("    " + this.mwr_size_h).slice(-4) + "\n" +
	    "HSR " + ("    " + this.hsr_start).slice(-4) +
	    "/ " + ("    " + this.hsr_width).slice(-4) +
	    " HDR " + ("    " + this.hdr_end).slice(-4) +
	    "/ " + ("    " + this.hdr_width).slice(-4) +
	    " VPR " + ("    " + this.vpr_start).slice(-4) +
	    "/ " + ("    " + this.vpr_width).slice(-4) +
	    " VDW " + ("    " + this.vdw_width).slice(-4) +
	    " VCR " + ("    " + this.vcr_width).slice(-4);
	return ret;
    }
    
    read(addr:number):number {
	let decode:string = "[GPU] reading @"+addr+ " ";
	let retval = 0;
	let ret = 0;
	switch(addr) {
	case 0: // reg
	    let v = (this.status_dma_inprogrss << 6) |
		(this.status_vblank << 5) |
		(this.status_vdma_complete << 4) |
		(this.status_satb_dma_complete << 3) |
		(this.status_hblank << 2) |
		(this.status_sprite_overflow << 1) |
		this.status_sprite0_collision;

	    this.status_vblank = 0;
	    this.status_hblank = 0;
	    this.status_satb_dma_complete = 0;
	    this.status_vdma_complete = 0;
	    
	    if(GPU.debug) {
		console.log(decode + "="+Util.hex(v,2));
	    }
	    return v;

	    
	    break;
	case 2: // low

	    ret = this.memory[this.vram_raddr];
	    decode += "(vram read " + Util.hex(ret,4) + " @ " + Util.hex(this.vram_raddr,4) + ")";
	    return ret & 0xff;

	    break;
	case 3: // high
	    ret = this.memory[this.vram_raddr];
	    decode += "(vram read " + Util.hex(ret,4) + " @ " + Util.hex(this.vram_raddr,4) + ")";
	    
	    this.vram_raddr = (this.vram_raddr + this.control_incr) & 0x7fff;
	    if(GPU.debug) {
		console.log(decode + "="+Util.hex(ret,4));
	    }
	    
	    return (ret & 0xff00)>>8;
	    break;
	}
	return 0;
    }

    
    
    write(addr:number, value:number) {
	let decode:string = "[GPU] writing "+Util.hex(value)+"@"+addr+ " ";
	if(GPU.debug) {
	    console.log(decode);
	}
	switch(addr) {
	case 0: // reg
	    this.iaddr = value;
	    break;
	case 2: // low
	    this.datal = value;
	    this.latchl[this.iaddr] = value;
	    if(this.iaddr != 2 && this.iaddr != 18) this.internal_write(this.iaddr, false);
	    break;
	case 3: // high
	    this.datah = value;
	    this.latchh[this.iaddr] = value;
	    this.internal_write(this.iaddr, true);
	}
	
    }

    internal_write(addr:number, incr:boolean){
	let decode:string = "[GPU Internal/write]";
	//	let v = (this.datah << 8) | this.datal;
	let v = (this.latchh[this.iaddr] << 8) | this.latchl[this.iaddr];
	switch(this.iaddr) {
	case 0: // write pointer
	    this.vram_waddr = (this.datah <<8) | (this.datal);
	    break;
	case 1: // read pointer
	    this.vram_raddr = (this.datah <<8) | (this.datal);
		
	    break;
	case 2: // vram access
	    this.memory[this.vram_waddr] = v;
	    decode += "(vram write "+Util.hex(v,4)+" @ "+Util.hex(this.vram_waddr,4)+")";
		
	    if(incr)this.vram_waddr = (this.vram_waddr + this.control_incr) & 0x7fff;
		
	    break;
	case 5:
	    //	    console.log(Util.hex((v),4));
	    switch((v&0x1800)>>11) {
	    case 0: // +1
		this.control_incr = 1;
		break;
	    case 1: // +32
		this.control_incr = 32;
		break;
	    case 2: // +64
		this.control_incr = 64;
		break;
	    case 3: // +128
		this.control_incr = 128;
		break;
	    }
	    this.control_bg_enable = (v&0x0080)>>7;
	    this.control_sprite_enable = (v&0x0040)>>6;
	    this.control_int_vblank = (v&0x0008)>>3;
	    this.control_int_hblank = (v&0x0004)>>2;
	    this.control_int_sprite_overflow = (v&0x0002)>>1;
	    this.control_int_sprite0_collision = v&0x0001;
	    decode += "(incr "+this.control_incr +
		" bgenable " + this.control_bg_enable +
		" spenable " + this.control_sprite_enable + 
		" vblank "+this.control_int_vblank +
		" hblank "+this.control_int_hblank +
		" spovfl "+this.control_int_sprite_overflow +
		" sp0col "+this.control_int_sprite0_collision + ")";
		    
	    break;
	case 6:
	    this.rcr = v & 0x3ff;
	    decode += "(rcr  "+this.rcr + ")";
	    break;
	case 7:
	    this.bxr = v & 0x3ff;
	    decode += "(bxr  "+this.bxr + ")";
	    break;
	case 8:
	    this.byr = v & 0x1ff;
	    decode += "(byr  "+this.byr + ")";
	    break;
	case 9:
	    switch((v&0x0070)>>4) {
	    case 0: this.mwr_size_w = 32; this.mwr_size_h = 32; break;
	    case 1: this.mwr_size_w = 64; this.mwr_size_h = 32; break;
	    case 2: this.mwr_size_w = 128; this.mwr_size_h = 32; break;
	    case 3: this.mwr_size_w = 128; this.mwr_size_h = 32; break;
	    case 4: this.mwr_size_w = 32; this.mwr_size_h = 64; break;
	    case 5: this.mwr_size_w = 64; this.mwr_size_h = 64; break;
	    case 6: this.mwr_size_w = 128; this.mwr_size_h = 64; break;
	    case 7: this.mwr_size_w = 128; this.mwr_size_h = 64; break;
	    }
	    decode += "(mwr  "+this.mwr_size_w + "x" + this.mwr_size_h+ ")";
	    break;
	case 10:
	    this.hsr_start = (v&0x7f00)>>8;
	    this.hsr_width = (v&0x001f);
	    decode += "(hsr  "+this.hsr_start + "/" + this.hsr_width+ ")";
	    break;
	case 11:
	    this.hdr_end = (v&0x7f00)>>8;
	    this.hdr_width = (v&0x003f);
	    decode += "(hdr  "+this.hdr_end + "/" + this.hdr_width+ ")";
	    break;
	case 12:
	    this.vpr_start = (v&0x7f00)>>8;
	    this.vpr_width = (v&0x001f);
	    decode += "(vpr  "+this.vpr_start + "/" + this.vpr_width+ ")";
	    break;
	case 13:
	    this.vdw_width = (v&0x01ff);
	    decode += "(vdw  "+this.vdw_width + ")";
	    break;
	case 14:
	    this.vcr_width = (v&0x00ff);
	    decode += "(vcr  "+this.vcr_width + ")";
	    break;
	case 15:
	    this.dcr_satb_auto = (v&0x0010);
	    this.dcr_vdma_dest_dec = (v&0x0008);
	    this.dcr_vdma_src_dec = (v & 0x0004);
	    this.dcr_vdma_complete = (v & 0x0002);
	    this.dcr_satb_dma_complete = (v & 0x0001);
	    decode += "(dcr satb "+this.dcr_satb_auto +
		" vdma_dest_dec " + this.dcr_vdma_dest_dec +
		" vdma_src_dec " + this.dcr_vdma_src_dec +
		" vdma_vdma_cmplt " + this.dcr_vdma_complete +
		" vdma_satb_dma_cmplt " + this.dcr_satb_dma_complete + ")";
	    break;
	case 16:
	    this.dma_src = v;
	    decode += "(dma src "+this.dma_src + ")";
	    break;
	case 17:
	    this.dma_dest = v;
	    decode += "(dma dest "+this.dma_dest + ")";
	    break;
	case 18:
	    this.dma_len = v;
	    decode += "(dma len "+this.dma_len + ")";
	    this.dma_exec();
	    break;
	case 19:
	    this.satb_addr = v;
	    decode += "(satb addr "+this.satb_addr + ")";
	    break;
		
	default:
	    decode += "(illegal)";
	}

	if(GPU.debug) {
	    console.log(decode);
	}
    }

    
    dma_exec() {

	let src = this.dma_src;
	let srcincr = this.dcr_vdma_src_dec == 1 ? -1 : 1;
	let dest = this.dma_dest;
	let destincr = this.dcr_vdma_dest_dec == 1 ? -1 : 1;
	for(let i = 0; i < this.dma_len; i ++) {
	    this.memory[dest] = this.memory[src];
	    src = src + srcincr;
	    dest = dest + destincr;
	}
    }
    
    tile_decode() {
	let taddr = 0;
	let plane = 0;
	let pbmp_addr = 0;
	let tiles:number[] = new Array<number>(16);
	let j;
	let y;
	let tx;
	let ty;
	let mem;
	let palette;
	let tdefaddr;

	let line = this.mwr_size_w * 8;
	for(ty = 0; ty < this.mwr_size_h; ty ++) {
	    for(tx = 0; tx < this.mwr_size_w; tx ++) {
		mem = this.memory[taddr];
		taddr = taddr + 1;
		palette = (mem & 0xf000) >> 8;
		tdefaddr = (mem & 0x0fff) << 4;
		for(j = 0; j < 16; j ++) {
		    tiles[j] = this.memory[tdefaddr + j];
		}
		for(y = 0; y < 8; y ++) {
		    // 0
		    plane = ((tiles[y] & 0x8000)>>14) | ((tiles[y] & 0x0080)>>7) | ((tiles[y+8] & 0x8000)>>12) | ((tiles[y+8] & 0x0080)>>5);
		    if(plane != 0) this.bitmap[pbmp_addr + 0] = palette|plane;

		    // 1
		    plane = ((tiles[y] & 0x4000)>>13) | ((tiles[y] & 0x0040)>>6) | ((tiles[y+8] & 0x4000)>>11) | ((tiles[y+8] & 0x0040)>>4);
		    if(plane != 0) this.bitmap[pbmp_addr + 1] = palette|plane;
		    
		    // 2
		    plane = ((tiles[y] & 0x2000)>>12) | ((tiles[y] & 0x0020)>>5) | ((tiles[y+8] & 0x2000)>>10) | ((tiles[y+8] & 0x0020)>>3);
		    if(plane != 0) this.bitmap[pbmp_addr + 2] = (palette|plane);
		    
		    // 3
		    plane = ((tiles[y] & 0x1000)>>11) | ((tiles[y] & 0x0010)>>4) | ((tiles[y+8] & 0x1000)>>9) | ((tiles[y+8] & 0x0010)>>2);
		    if(plane != 0) this.bitmap[pbmp_addr + 3] = (palette|plane);
		    
		    // 4
		    plane = ((tiles[y] & 0x0800)>>10) | ((tiles[y] & 0x0008)>>3) | ((tiles[y+8] & 0x0800)>>8) | ((tiles[y+8] & 0x0008)>>1);
		    if(plane != 0) this.bitmap[pbmp_addr + 4] = (palette|plane);

		    // 5
		    plane = ((tiles[y] & 0x0400)>>9) | ((tiles[y] & 0x0004)>>2) | ((tiles[y+8] & 0x0400)>>7) | ((tiles[y+8] & 0x0004));
		    if(plane != 0) this.bitmap[pbmp_addr + 5] = (palette|plane);

		    // 6
		    plane = ((tiles[y] & 0x0200)>>8) | ((tiles[y] & 0x0002)>>1) | ((tiles[y+8] & 0x0200)>>6) | ((tiles[y+8] & 0x0002)<<1);
		    if(plane != 0) this.bitmap[pbmp_addr + 6] = (palette|plane);

		    // 7
		    plane = ((tiles[y] & 0x0100)>>7) | ((tiles[y] & 0x0001)) | ((tiles[y+8] & 0x0100)>>5) | ((tiles[y+8] & 0x0001)<<2);
		    if(plane != 0) this.bitmap[pbmp_addr + 7] = (palette|plane);

		    pbmp_addr = pbmp_addr + this.mwr_size_w*8;
		}
		pbmp_addr = pbmp_addr - this.mwr_size_w*8*8 + 8;
	    }
	    //pbmp_addr = pbmp_addr - this.mwr_size_w * 8 + GPU.PALBITMAP_W * 8;
	    pbmp_addr = pbmp_addr - this.mwr_size_w*8 + this.mwr_size_w*8*8;
	    
	}
    }

    sprite_satb_decode() {
	let addr = this.satb_addr;
	for(let i = 0; i < GPU.SPRITE_SIZE; i ++) {
	    this.sprites[i].ypos = (this.memory[addr] & 0x3ff);
	    addr = addr + 1;
	    this.sprites[i].xpos = this.memory[addr] & 0x3ff;
	    addr = addr + 1;
	    this.sprites[i].saddr = (this.memory[addr] & 0x7ff) << 5;
	    addr = addr + 1;
	    let v = this.memory[addr];
	    
	    this.sprites[i].yflip = (v & 0x8000) >> 15;
	    this.sprites[i].ysize = (v & 0x3000) >> 12;
	       if(this.sprites[i].ysize == 2) this.sprites[i].ysize = 3;
	    this.sprites[i].xflip = (v & 0x0800) >> 11;
	    this.sprites[i].xsize = (v & 0x0100) >> 8;
	    this.sprites[i].fg = (v & 0x0080) >> 7;
	    this.sprites[i].pal = (v & 0xf)<<4;
	    addr = addr + 1;
	}
    }
    
    sprite_pattern_decode(fg:number) {
	let wrap = this.mwr_size_w * 8 * this.mwr_size_h * 8 - 1;
	for(let i = GPU.SPRITE_SIZE - 1; i >= 0 ; i --) {
	    if(this.sprites[i].fg != fg) continue;

	    let size = (this.sprites[i].ysize+1)*(this.sprites[i].xsize+1);
	    let m:number[] = new Array<number>(64*size);
	    for(let j = 0; j < 64*size; j ++) {
		m[j] = this.memory[this.sprites[i].saddr + j];
	    }
	    /*    
	    let paddr = (this.sprites[i].ypos - 64 + this.byr) * this.mwr_size_w*8 + this.sprites[i].xpos - 32 + this.bxr;
	    */
	    let paddr;
	    let maddr = 0;
	    let xsign = this.sprites[i].xflip == 0 ? 1 : -1;
	    let xoffset = this.sprites[i].xflip == 0 ? 0 : 1;
	    let ysign = this.sprites[i].yflip == 0 ? 1 : -1;
	    let yoffset = this.sprites[i].yflip == 0 ? 0 : 1;
	    let dx;
	    let dy;
	    for(let cy = 0; cy < this.sprites[i].ysize+1; cy ++) {
		for(let cx = 0; cx < this.sprites[i].xsize+1; cx ++) {
		    for(let y = 0; y < 16; y ++) {
			for(let x = 0; x < 16; x ++) {
			    let bit = 15 - x;
			    let mask = 1 << bit;
			    let plane = ((m[maddr] & mask)>>bit) | (((m[maddr+16] & mask)>>bit)<<1) | (((m[maddr+32] & mask)>>bit)<<2) | (((m[maddr+48] & mask)>>bit)<<3);
			    if(plane != 0) {
				dx = this.sprites[i].xpos - 32 + this.bxr + xoffset*((this.sprites[i].xsize+1)*16-1) + (x+cx*16)*xsign;
				dy = this.sprites[i].ypos - 64 + this.byr + yoffset*((this.sprites[i].ysize+1)*16-1) + (y+cy*16)*ysign;
				if(dx >= 0 + this.bxr && dx < this.mwr_size_w * 8 + this.bxr
				   &&
				   dy >= 0 + this.byr && dy < this.mwr_size_h * 8 + this.byr) {
				    paddr = dy * this.mwr_size_w * 8 + dx;
				    this.bitmap[paddr&wrap] = 0x100 | (this.sprites[i].pal | plane);
				}

			    }
			    //paddr = paddr + 1;
			}
			maddr = maddr + 1;
			//paddr = paddr - 16 + this.mwr_size_w*8;
		    }
		    maddr = maddr - 16+64;

		    //paddr = paddr + 16 - this.mwr_size_w * 8 * 16;
		    
		}
		//paddr = paddr - (this.sprites[i].xsize+1) * 16 + this.mwr_size_w * 8 * 16;
	   
	    }
	    
	}	
    }

    palbitmap_decode() {

	if(this.skip_left > 0) {
	    this.skip_left --;
	    return;
	} else {
	    this.skip_left = GPU.FRAME_SKIP;
	}
	
	this.bitmap.fill(0);
	this.sprite_satb_decode();
	this.sprite_pattern_decode(0);
	this.tile_decode();
	this.sprite_pattern_decode(1);
	this.debug_vsync_called ++;
    }



    

    get_bitmap_index(x:number, y:number):number {
	let pal = this.bitmap[y * this.mwr_size_w*8 + x];
	if(pal == undefined) {
	    console.log("get_bitmap_index "+x+","+y);
	}
	return pal;
    }



    vsync_count(step:number) {
	let max = Math.floor(System.BASE_CLOCK * 2 /60);
	this.vsync_counter = this.vsync_counter + step;
	if(this.vsync_counter >= max) {
	    this.vsync_interrupt = true;
	    this.status_vblank = 1;
	    this.status_satb_dma_complete = 1;
	    this.status_vdma_complete = 1;
	    this.vsync_counter = this.vsync_counter - max;
	}
    }
    
}

export class Channel {
    static BASE_CLOCK:number = 3579545;
    static WAVETABLE_SIZE:number = 32;

    playback_enable:number;
    dda_enable:number;
    volume:number;
    vol_l:number;
    vol_r:number;
    period:number;
    freq:number;
    freq_low:number;
    freq_high:number;
    wavetable:number[];
    pointer:number;
    is_noise:number;
    noise_freq:number;

    
    constructor() {
	this.playback_enable = 0;
	this.dda_enable = 0;
	this.volume = 0;
	this.vol_l = 0;
	this.vol_r = 0;
	this.freq = 0;
	this.freq_low = 0;
	this.freq_high = 0;
	this.period = 0;
	this.wavetable = new Array<number>(Channel.WAVETABLE_SIZE);
	this.wavetable.fill(0);
	this.pointer = 0;
	this.noise_freq = 0;
	this.is_noise = 0;
    }

    freq_update() {
	this.period = (this.freq_low | (this.freq_high << 8));
	if(this.period == 0) this.period = 1;
	this.freq = Channel.BASE_CLOCK / (32*this.period); // Hz for whole table
    }
    wavetable_update(value:number) {
	this.wavetable[this.pointer] = value;
	this.pointer = (this.pointer + 1) & 0x1f;
    }
    get_text():string {
	let freq = this.freq;
	if(this.is_noise == 1) freq = this.noise_freq;
	let ret = (this.playback_enable == 0 ? "OFF " : "ON  ") +
	    (this.dda_enable == 0 ? "    " : "DDA ") +
	    " V " + ("  "+this.volume).slice(-2) +
	    " L " + ("  "+this.vol_l).slice(-2) +
	    " R " + ("  "+this.vol_r).slice(-2) +
	    " freq " + (""+freq).slice(0,6) +
	    (this.is_noise == 0 ? "      " : "(Noise) ");
	return ret;
	    
    }
}

export class PSG {
    static readonly NUM_CHANNELS = 6;
    static debug:boolean = false;
    
    channels:Channel[];
    mastervol_l:number;
    mastervol_r:number;
    current_channel:number;
    lfo_period:number;
    lfo_freq:number;
    static readonly LFO_MODE_STOP = 0;
    static readonly LFO_MODE_x1 = 1;
    static readonly LFO_MODE_x16 = 2;
    static readonly LFO_MODE_x256 = 3;
    static LFO_MODE_STRING:string[] = [
				       "OFF ","x1  ","x16 ","x256",
				       ];
    lfo_operation:number;
    lfo_reset:number;

    dump_get_text():string {
	let ret = "PSG\n";
	ret += "L " + ("  "+this.mastervol_l).slice(-2) +
	    " R " + ("  "+this.mastervol_l).slice(-2) +
	    " LFO Mode " + PSG.LFO_MODE_STRING[this.lfo_operation] + 
	    " freq " + ("  "+this.lfo_freq).slice(0,3) + 
	    (this.lfo_reset == 1 ? "RST " : "   ") + "\n";

	for(let i = 0; i < PSG.NUM_CHANNELS; i ++) {
	    ret += "CH" + i + " "+ this.channels[i].get_text() + "\n";
	}
	return ret;
    }
    
    constructor() {
	this.channels = new Array<Channel>(PSG.NUM_CHANNELS);
	for(let i = 0 ; i < PSG.NUM_CHANNELS; i ++) {
	    this.channels[i] = new Channel();
	}
	this.mastervol_l = 0;
	this.mastervol_r = 0;
	this.current_channel = 0;
	this.lfo_reset = 0;
	this.lfo_operation = 0;
    }
    
    read(addr:number):number {
	return 0; // illegal
    }

    write(addr:number, value:number) {
	let decode:string = "[PSG] writing "+value+"@"+addr+ " ";
	
	switch(addr) {
	case 0: // channel select
	    this.current_channel = value % 6;
	    decode += "(Channel Select " + this.current_channel + ")";
	    break;
	case 1: // master volume
	    this.mastervol_l = (value & 0xf0) >> 4;
	    this.mastervol_r = value & 0x0f;
	    decode += "(Master Volume "+this.mastervol_l+"/"+this.mastervol_r+")";
	    break;
	case 2: // freq low
	    this.channels[this.current_channel].freq_low = value;
	    this.channels[this.current_channel].freq_update();
	    decode += "(Freq low)";
	    break;
	case 3: // freq high
	    this.channels[this.current_channel].freq_high = value & 0x0f;
	    this.channels[this.current_channel].freq_update();
	    decode += "(Freq high)";
	    break;
	case 4: // channel control
	    let chanvol = value & 0x1f;
	    this.channels[this.current_channel].volume = chanvol;
	    let mode = (value & 0xc0) >> 6;
	    switch(mode) {
	    case 0:
		this.channels[this.current_channel].playback_enable = 0;
		break;
	    case 1:
		this.channels[this.current_channel].pointer = 0;
		break;
	    case 2:
		this.channels[this.current_channel].playback_enable = 1;
		break;
	    case 3:
		this.channels[this.current_channel].dda_enable = 1;
		break;
	    }
	    decode += "(Channel Volume " + chanvol + " mode" + mode;
	    break;
	case 5: // channel pan
	    let left = (value & 0xf0) >> 4;
	    let right = value & 0xf;
	    this.channels[this.current_channel].vol_l = left;
	    this.channels[this.current_channel].vol_r = right;
	    decode += "(Pan "+left+"/"+right+")";
	    break;
	case 6: // wavetable update
	    this.channels[this.current_channel].wavetable_update(value);
	    decode += "(Wavetable)";
	    break;
	case 7: // noise mode
	    
	    let noise_freq = Channel.BASE_CLOCK / (64 * ((value & 0x1f) ^ 0x1f));
	    this.channels[this.current_channel].noise_freq = noise_freq;
	    let enable = ((value & 0x80) != 0);
	    this.channels[this.current_channel].is_noise = enable ? 1 : 0;
	    decode += "(Noise "+noise_freq+" enable=" + enable +")";
	    break;
	case 8: // LFO freq
	    this.lfo_freq = value;
	    break;
	case 9: // LFO control;
	    this.lfo_operation = value & 0x3;
	    this.lfo_reset = ((value & 0x80) != 0) ? 1 : 0;
	    decode += "(LFO ctrl op="+this.lfo_operation+" mode="+this.lfo_reset+")";
	    break;
	}
	if(PSG.debug){
	    console.log(decode);
	}
    }
}

export class Hardware {
    timer:Timer;
    gamepad:GamePad;
    mask:InterruptMask;
    gpu:GPU;
    pal:Pal;
    psg:PSG;
    
    constructor() {
	this.timer = null;
	this.gamepad = null;
	this.mask = null;
	this.gpu = null;
	this.psg = null;
	this.pal = null;
    }

    attach(timer:Timer,
	   pad:GamePad,
	   mask:InterruptMask,
	   gpu:GPU,
	   pal:Pal,
	   psg:PSG){
	this.timer = timer;
	this.gamepad = pad;
	this.mask = mask;
	this.gpu = gpu;
	this.pal = pal;
	this.psg = psg;
    }
    
    read(addr:number):number {
	if(addr == 0x0000 || addr == 0x0002 || addr == 0x0003) {
	    return this.gpu.read(addr & 0x3);
	} else if(addr >= 0x0400 && addr <= 0x0407){
	    return this.pal.read(addr & 0x7);
	} else if(addr >= 0x0800 && addr <= 0x0809) {
	    return this.psg.read(addr & 0xf);
	} else if(addr == 0x0c00 || addr == 0x0c01) {
	    return this.timer.read(addr & 0x3);
	} else if(addr == 0x1000) {
	    return this.gamepad.read(0);
	} else if(addr == 0x1402 || addr == 0x1403) {
	    return this.mask.read(addr & 0xf);
	} else {
	    
	}
	return 0;
    }
    
    write(addr:number, value:number) {
	if(addr == 0x0000 || addr == 0x0002 || addr == 0x0003) {
	    this.gpu.write(addr & 0x3, value);
	} else if(addr >= 0x0400 && addr <= 0x0407) {
	    this.pal.write(addr & 0x7, value);
	} else if(addr >= 0x0800 && addr <= 0x0809) {
	    this.psg.write(addr & 0xf, value);
	} else if(addr == 0x0c00 || addr == 0x0c01) {
	    this.timer.write(addr & 0x3, value);
	} else if(addr == 0x1000) {
	    this.gamepad.write(0, value);
	} else if(addr == 0x1402 || addr == 0x1403) {
	    this.mask.write(addr & 0x3, value);
	    if(addr == 0x1403){
		this.timer.interrupt = false;
	    }
	} else {

	}
    }


}

export class MemoryController {
    MPR:number[];
    offset:number;
    bank:number;
    ram:RAM;
    rom:ROM;
    hardware:Hardware;
    error:boolean;
    errorLog:string;
    
    constructor() {
	this.MPR = [0xff, 0xf8, 0, 0, 0, 0, 0, 0];
	this.offset = 0;
	this.bank = 0;
	this.ram = null;
	this.rom = null;
	this.hardware = null;
	this.error = false;
	this.errorLog = "";
    }

    attach(rom:ROM, ram:RAM, hw:Hardware) {
	this.rom = rom;
	this.ram = ram;
	this.hardware = hw;
    }
    
    
    reset() {
	this.MPR = [0xff, 0xf8, 0, 0, 0, 0, 0, 0];
    }
    
    regdump_get_text():string {
	return "MPR " + Util.hex(this.MPR[0]) +
	    " " + Util.hex(this.MPR[1]) +
	    " " + Util.hex(this.MPR[2]) +
	    " " + Util.hex(this.MPR[3]) +
	    " " + Util.hex(this.MPR[4]) +
	    " " + Util.hex(this.MPR[5]) +
	    " " + Util.hex(this.MPR[6]) +
	    " " + Util.hex(this.MPR[7]) ;
    }
    
    memdump_get_text(addr:number, length:number = 128):string {
	
	let ret:string = "";
	ret += "Rom Size:" + Util.hex(this.rom.length(),8) + " Ram size: " + Util.hex(this.ram.length(),4) + "\n";
	ret += this.regdump_get_text() + "\nMem\n";
	let iaddr = addr;
	for(let i = 0; i < length; i ++) {
	    if((iaddr - addr) % 16 == 0) {
		ret += "\n" + Util.hex(iaddr, 4);
	    }
	    ret += " " + Util.hex(this.read(iaddr));
	    iaddr = (iaddr + 1)& 0xffff;
	}
	ret += "\n";
	return ret;
	
    }
    
    map(addr:number) {
	let segment = (addr >> 13) & 0x7;
	this.offset = addr & 0x1fff;
	this.bank = this.MPR[segment];

	//console.log("seg:"+segment);
	//console.log("off:"+Util.hex(this.offset,4));
	//console.log("bank:"+this.bank);

    }
    
    read(addr:number):number {
	//	console.log("reading " + addr);
	this.map(addr);
	if(this.bank < 0x80) { // ROM
	    return this.rom.read(this.bank * 0x2000 + this.offset);
	} else if(this.bank == 0xf7) { // battery backup RAM
	    return 0;
	} else if(this.bank == 0xf8) { // RAM
	    return this.ram.read(this.offset);
	} else if(this.bank == 0xff) { // hardware
	    return this.hardware.read(this.offset);
	} else { // illegal access
	    this.errorLog = "Error reading bank " + this.bank;
	    this.error = true;
	}
    }
    
    write(addr:number, value:number) {
	this.map(addr);
	if(this.bank < 0x80) { // ROM, illegal
	    this.errorLog = "Error writing bank " + this.bank;
	    this.error = true;
	} else if(this.bank == 0xf7) { // battery backup RAM
	    // not implemented
	} else if(this.bank == 0xf8) { // RAM
	    this.ram.write(this.offset, value);
	} else if(this.bank == 0xff) { // hardware
	    this.hardware.write(this.offset, value);
	    // not implemented
	} else { // illegal access
	    this.errorLog = "Error writing bank " + this.bank;
	    this.error = true;
	}
    }
    
}

export class CPU { // HuC6280
    static readonly ZEROPAGEBASE = 0x2000;
    static readonly STACKBASE = 0x2100;
    static readonly RESET_VECTOR = 0xfffe;
    static readonly NMI_VECTOR = 0xfffc;
    static readonly TIMER_VECTOR = 0xfffa;
    static readonly IRQ1_VECTOR = 0xfff8;
    static readonly IRQ2_VECTOR = 0xfff6;

    
    static debug:boolean = false;
    static ignorecycle = false;
    static debugfind:boolean = false;
    static debugbreak:boolean = false;

    findopcode:number;
    findoccurmax:number;
    findoccur:number;
    breakaddr:number;
    breakleft:number;
    breaking:boolean = false;
    debugstartticks:number;
    debugticks:number;
    debugticksenable:boolean;
    
    static infiniteskip = 500;// skip clock;
    infiniteloop:boolean;
    infinite_addr:number[];
    infinite_check_index:number;


    
    ticks:number;
    
    A:number;  // accumulator
    X:number;  // index X
    Y:number;  // index Y
    PC:number; // program counter
    SP:number; // stack
    P:number;  // status or flag ... NVTBDIZC
    
    Mem:MemoryController;

    work_addr:number;
    work_addr2:number;
    work_zaddr:number;
    work_value:number;
    work_value2:number; // second oprand
    work_rr:number;
    work_flag:number;
    
    static readonly CLOCKSPEED_HIGH = 7159090;
    static readonly CLOCKSPEED_LOW = CPU.CLOCKSPEED_HIGH/4;
    clockspeed:number;

    decode:string;
    decode_raw:string;
    error:boolean;
    cycleleft:number;

    currentaddr:number;
    current_opcode:number;

    abort:boolean;


    imm:boolean;

    regdump_get_text():string {
	return ("Regs : A=" + Util.hex(this.A) +
	    " X=" + Util.hex(this.X) +
	    " Y=" + Util.hex(this.Y) +
	    " PC=" + Util.hex(this.PC, 4) +
	    " SP=" + Util.hex(this.SP) +
		" P=" + Util.hex(this.P)) ;
    }



    dump():void {
	
	console.log("----------------------------------------");
	console.log("ticks "+this.ticks);
	console.log(this.regdump_get_text());
	console.log(this.Mem.memdump_get_text(this.PC));
    }
    
    dump_get_text():string {
	let ret = "----------------------------------------\n" +
	    "ticks "+this.ticks + "\n" +
		this.regdump_get_text() +"\n" +
		this.Mem.memdump_get_text(this.PC);
	return ret;
    }
    
    constructor() {
	this.A = 0;
	this.X = 0;
	this.Y = 0;
	this.PC = 0;
	this.SP = 0xff;
	this.P = 0;
	this.Mem = null;
	this.error = false;
	this.findopcode = 0;
	this.findoccurmax = 1;
	this.findoccur = 0;
	this.breakaddr = 0;
	this.abort = false;
	this.ticks = 1;
	this.cycleleft = 0;
	this.debugstartticks = 0;
	this.debugticks = 0;
	this.debugticksenable = false;
	this.currentaddr = 0;
	this.current_opcode = 0;
	
	this.infiniteloop = false;
	this.infinite_addr = new Array<number>(2);
	this.infinite_addr.fill(0);
	this.infinite_check_index = 0;
    }

    attach(mem:MemoryController) {
	this.Mem = mem;
    }

    reset():void {
	this.Mem.reset();
	let ll = this.Mem.read(CPU.RESET_VECTOR);
	let hh = this.Mem.read(CPU.RESET_VECTOR + 1);
	this.PC = (hh << 8) | ll;
	this.SP = 0xff;
	this.clockspeed = CPU.CLOCKSPEED_HIGH;
    }

    flagC0():void {this.P = this.P & (~0x01);}
    flagC1():void {this.P = this.P | 0x01;}
    flagC():number {return this.P&0x01;}

    flagZ0():void {this.P = this.P & (~0x02);}
    flagZ1():void {this.P = this.P | 0x02;}
    flagZ():number {return (this.P&0x02)>>1;}

    flagI0():void {this.P = this.P & (~0x04);}
    flagI1():void {this.P = this.P | 0x04;}
    flagI():number {return (this.P&0x04)>>2;}
    
    flagD0():void {this.P = this.P & (~0x08);}
    flagD1():void {this.P = this.P | 0x08;}
    flagD():number {return (this.P&0x08)>>3;}
    
    flagB0():void {this.P = this.P & (~0x10);}
    flagB1():void {this.P = this.P | 0x10;}
    flagB():number {return (this.P&0x10)>>4;}
    
    flagT0():void {this.P = this.P & (~0x20);}
    flagT1():void {this.P = this.P | 0x20;}
    flagT():number {return (this.P&0x20)>>5;}
    
    flagV0():void {this.P = this.P & (~0x40);}
    flagV1():void {this.P = this.P | 0x40;}
    flagV():number {return (this.P&0x40)>>6;}
    
    flagN0():void {this.P = this.P & (~0x80);}
    flagN1():void {this.P = this.P | 0x80;}
    flagN():number {return (this.P&0x80)>>7;}

    cycle(n:number):void {
	this.cycleleft += n;
    }

    step(stepnum:number = 0) {
	for(let i = 0; i < stepnum; i ++) {
	    let skip = this.cycleleft;
	    this.subsystem_exec(skip);
	    this.exec(skip);
	    i = i + skip - 1;
	    if(this.abort) return;
	}
    }
    

    interrupt(vector:number) {
	this.infiniteloop = false;
	this.push((this.PC & 0xff00) >> 8);
	this.push((this.PC & 0x00ff));
	this.push(this.P);
	let ll = this.Mem.read(vector);
	let hh = this.Mem.read(vector + 1);
	this.PC = (hh<<8) | ll;
	this.flagT0();
	this.flagB0();
	this.flagD0();
	this.flagI1();
	this.cycle(8);
    }

    subsystem_exec(stepnum:number = 1) {
	this.Mem.hardware.gpu.vsync_count(stepnum);
	if(this.Mem.hardware.gpu.vsync_interrupt){
	    this.Mem.hardware.gpu.vsync_interrupt = false;
	    // sprite/bg decode
	    this.Mem.hardware.gpu.palbitmap_decode();
	    if(this.flagI() == 0 &&
	       this.Mem.hardware.mask.irq1 == 0){
		this.Mem.hardware.gpu.status_vblank = 1;
		this.interrupt(CPU.IRQ1_VECTOR);
		//		console.log("vsync");
	    }
	}
	
	this.Mem.hardware.timer.exec(stepnum);
	
	
	if(this.Mem.hardware.timer.interrupt) {
	    if(this.flagI() == 0 &&
	       this.Mem.hardware.mask.timer == 0){
		//console.log("interrupt");
		this.interrupt(CPU.TIMER_VECTOR);
	    } else {
		//console.log("interrupt masked");
	    }

	    // this is done by write any value on 0x1403
	    this.Mem.hardware.timer.interrupt = false;
	}
    }

    exec(step:number = 1):boolean {
	this.ticks = this.ticks + step;
	if(this.debugticksenable){
	    this.debugticks = this.debugticks + step;
	    if(this.debugticks > 1000000) {
		this.debugticks -= 1000000;
		this.dump();
	    }
	}
	
	if(this.debugstartticks > 0 ) {
	    if(this.ticks > this.debugstartticks) CPU.debug = true;
	}
	
	this.cycleleft = this.cycleleft - step;
	if(!CPU.ignorecycle) {

	    if(this.cycleleft > 0) {

		this.cycleleft = this.cycleleft - 1;
		return false;
	    }
	}
	
	this.currentaddr = this.PC;
	this.current_opcode = this.Mem.read(this.PC);

	if(CPU.debugbreak) {
	    if(this.breaking || this.currentaddr == this.breakaddr){
		this.breaking = true;
		CPU.debug = true;
		GPU.debug = true;
		Pal.debug = true;
		if(this.breakleft <= 0) {
		    this.abort = true;
		    this.dump();
		    return;
		} else {
		    this.breakleft --;
		}
	    }
	}
	
	if(CPU.debugfind) {
	    if(this.current_opcode == this.findopcode) {
		this.findoccur ++;
		if(this.findoccurmax == this.findoccur) {
		    this.abort = true;
		    this.dump();
		    return;
		}
	    }
	}

	if(this.infiniteloop) {
	    this.cycleleft += CPU.infiniteskip;
	    return;
	}

	
	this.decode = "undecoded";
	this.decode_raw = Util.hex(this.current_opcode) + " ";
	this.PC = (this.PC + 1) & 0xffff;
	
	switch(this.current_opcode) {

	    // Add with carry
	case 0x69: this.ADC_imm(); break;
	case 0x65: this.ADC_zp(); break;
	case 0x75: this.ADC_zpx(); break;
	case 0x72: this.ADC_ind(); break;
	case 0x61: this.ADC_inx(); break;
	case 0x71: this.ADC_iny(); break;
	case 0x6d: this.ADC_abs(); break;
	case 0x7d: this.ADC_abx(); break;
	case 0x79: this.ADC_aby(); break;
	    
	    // And
	case 0x29: this.AND_imm(); break;
	case 0x25: this.AND_zp(); break;
	case 0x35: this.AND_zpx(); break;
	case 0x32: this.AND_ind(); break;
	case 0x21: this.AND_inx(); break;
	case 0x31: this.AND_iny(); break;
	case 0x2d: this.AND_abs(); break;
	case 0x3d: this.AND_abx(); break;
	case 0x39: this.AND_aby(); break;
	    
	    // shift left
	case 0x06: this.ASL_zp(); break;
	case 0x16: this.ASL_zpx(); break;
	case 0x0e: this.ASL_abs(); break;
	case 0x1e: this.ASL_abx(); break;
	case 0x0a: this.ASL_acc(); break;
	    
	    // branch on bit reset
	case 0x0f: this.BBR(0); break;
	case 0x1f: this.BBR(1); break;
	case 0x2f: this.BBR(2); break;
	case 0x3f: this.BBR(3); break;
	case 0x4f: this.BBR(4); break;
	case 0x5f: this.BBR(5); break;
	case 0x6f: this.BBR(6); break;
	case 0x7f: this.BBR(7); break;
	    
	    // branch on carry clear
	case 0x90: this.BCC(); break;

	    // branch on bit set
	case 0x8f: this.BBS(0); break;
	case 0x9f: this.BBS(1); break;
	case 0xaf: this.BBS(2); break;
	case 0xbf: this.BBS(3); break;
	case 0xcf: this.BBS(4); break;
	case 0xdf: this.BBS(5); break;
	case 0xef: this.BBS(6); break;
	case 0xff: this.BBS(7); break;
	    
	    // branch on carry set
	case 0xb0: this.BCS(); break;

	    // branch on equal
	case 0xf0: this.BEQ(); break;
	    
	    // test AND
	case 0x89: this.BIT_imm(); break;
	case 0x24: this.BIT_zp(); break;
	case 0x34: this.BIT_zpx(); break;
	case 0x2c: this.BIT_abs(); break;
	case 0x3c: this.BIT_abx(); break;
	    
	    // branch on minus
	case 0x30: this.BMI(); break;
	    
	    // branch on not equal
	case 0xd0: this.BNE(); break;
	    
	    // branch on plus
	case 0x10: this.BPL(); break;
	    
	    // branch always
	case 0x80: this.BRA(); break;
	    
	    // break
	case 0x00: this.BRK(); break;
	    
	    // branch sub
	case 0x44: this.BSR(); break;
	    
	    // branch overflow set
	case 0x70: this.BVS(); break;
	    
	    // branch overflow clear
	case 0x50: this.BVC(); break;
	    
	    // clear flags/regs
	case 0x18: this.CLC(); break;
	case 0x62: this.CLA(); break;
	case 0xd8: this.CLD(); break;
	case 0x58: this.CLI(); break;
	case 0xb8: this.CLV(); break;
	case 0xc2: this.CLY(); break;
	case 0x82: this.CLX(); break;
	    
	    // compare X
	case 0xe0: this.CPX_imm(); break;
	case 0xe4: this.CPX_zp(); break;
	case 0xec: this.CPX_abs(); break;

	    // change cpu speed
	case 0xd4: this.CSH(); break;
	case 0x54: this.CSL(); break;
	    
	    // compare A
	case 0xc9: this.CMP_imm(); break;
	case 0xc5: this.CMP_zp(); break;
	case 0xd5: this.CMP_zpx(); break;
	case 0xd2: this.CMP_ind(); break;
	case 0xc1: this.CMP_inx(); break;
	case 0xd1: this.CMP_iny(); break;
	case 0xcd: this.CMP_abs(); break;
	case 0xdd: this.CMP_abx(); break;
	case 0xd9: this.CMP_aby(); break;

	    // decrement X
	case 0xca: this.DEX(); break;

	    // decrement mem/A
	case 0xc6: this.DEC_zp(); break;
	case 0xd6: this.DEC_zpx(); break;
	case 0xce: this.DEC_abs(); break;
	case 0xde: this.DEC_abx(); break;
	case 0x3a: this.DEC_acc(); break;
	    
	    // compare Y
	case 0xc0: this.CPY_imm(); break;
	case 0xc4: this.CPY_zp(); break;
	case 0xcc: this.CPY_abs(); break;
	    
	    // XOR
	case 0x49: this.EOR_imm(); break;
	case 0x45: this.EOR_zp(); break;
	case 0x55: this.EOR_zpx(); break;
	case 0x52: this.EOR_ind(); break;
	case 0x41: this.EOR_inx(); break;
	case 0x51: this.EOR_iny(); break;
	case 0x4d: this.EOR_abs(); break;
	case 0x5d: this.EOR_abx(); break;
	case 0x59: this.EOR_aby(); break;

	    // increment mem/A
	case 0xe6: this.INC_zp(); break;
	case 0xf6: this.INC_zpx(); break;
	case 0xee: this.INC_abs(); break;
	case 0xfe: this.INC_abx(); break;
	case 0x1a: this.INC_acc(); break;
	    
	    // increment X
	case 0xe8: this.INX(); break;
	    
	    // decrement Y
	case 0x88: this.DEY(); break;
	    
	    // increment Y
	case 0xc8: this.INY(); break;

	    // jump
	case 0x4c: this.JMP_abs(); break;
	case 0x6c: this.JMP_ain(); break;
	case 0x7c: this.JMP_aix(); break;
	    
	    // jump sub
	case 0x20: this.JSR(); break;
	    
	    // load A
	case 0xa9: this.LDA_imm(); break;
	case 0xa5: this.LDA_zp(); break;
	case 0xb5: this.LDA_zpx(); break;
	case 0xb2: this.LDA_ind(); break;
	case 0xa1: this.LDA_inx(); break;
	case 0xb1: this.LDA_iny(); break;
	case 0xad: this.LDA_abs(); break;
	case 0xbd: this.LDA_abx(); break;
	case 0xb9: this.LDA_aby(); break;
	    
	    // load X
	case 0xa2: this.LDX_imm(); break;
	case 0xa6: this.LDX_zp(); break;
	case 0xb6: this.LDX_zpy(); break;
	case 0xae: this.LDX_abs(); break;
	case 0xbe: this.LDX_aby(); break;
	    
	    // load Y
	case 0xa0: this.LDY_imm(); break;
	case 0xa4: this.LDY_zp(); break;
	case 0xb4: this.LDY_zpx(); break;
	case 0xac: this.LDY_abs(); break;
	case 0xbc: this.LDY_abx(); break;
	    
	    // shift right
	case 0x46: this.LSR_zp(); break;
	case 0x56: this.LSR_zpx(); break;
	case 0x4e: this.LSR_abs(); break;
	case 0x5e: this.LSR_abx(); break;
	case 0x4a: this.LSR_acc(); break;
	    
	    // Or
	case 0x09: this.ORA_imm(); break;
	case 0x05: this.ORA_zp(); break;
	case 0x15: this.ORA_zpx(); break;
	case 0x12: this.ORA_ind(); break;
	case 0x01: this.ORA_inx(); break;
	case 0x11: this.ORA_iny(); break;
	case 0x0d: this.ORA_abs(); break;
	case 0x1d: this.ORA_abx(); break;
	case 0x19: this.ORA_aby(); break;
	    
	    // NOP
	case 0xea: this.NOP(); break;

	    // push/pull
	case 0x48: this.PHA(); break;
	case 0x08: this.PHP(); break;
	case 0xda: this.PHX(); break;
	case 0x5a: this.PHY(); break;
	case 0x68: this.PLA(); break;
	case 0x28: this.PLP(); break;
	case 0xfa: this.PLX(); break;
	case 0x7a: this.PLY(); break;

	    // rotate left
	case 0x26: this.ROL_zp(); break;
	case 0x36: this.ROL_zpx(); break;
	case 0x2e: this.ROL_abs(); break;
	case 0x3e: this.ROL_abx(); break;
	case 0x2a: this.ROL_acc(); break;
	    
	    // reset memory bit
	case 0x07: this.RMB(0); break;
	case 0x17: this.RMB(1); break;
	case 0x27: this.RMB(2); break;
	case 0x37: this.RMB(3); break;
	case 0x47: this.RMB(4); break;
	case 0x57: this.RMB(5); break;
	case 0x67: this.RMB(6); break;
	case 0x77: this.RMB(7); break;
	    
	    // rotate right
	case 0x66: this.ROR_zp(); break;
	case 0x76: this.ROR_zpx(); break;
	case 0x6e: this.ROR_abs(); break;
	case 0x7e: this.ROR_abx(); break;
	case 0x6a: this.ROR_acc(); break;

	    // return
	case 0x40: this.RTI(); break;
	case 0x60: this.RTS(); break;
	    
	    // swap
	case 0x22: this.SAX(); break;
	case 0x42: this.SAY(); break;

	    // Subtract with borrow
	case 0xe9: this.SBC_imm(); break;
	case 0xe5: this.SBC_zp(); break;
	case 0xf5: this.SBC_zpx(); break;
	case 0xf2: this.SBC_ind(); break;
	case 0xe1: this.SBC_inx(); break;
	case 0xf1: this.SBC_iny(); break;
	case 0xed: this.SBC_abs(); break;
	case 0xfd: this.SBC_abx(); break;
	case 0xf9: this.SBC_aby(); break;
	    
	    // set flags
	case 0xf8: this.SED(); break;
	case 0x38: this.SEC(); break;
	case 0x78: this.SEI(); break;
	case 0xf4: this.SET(); break;
	    
	    // special
	case 0x03: this.ST0(); break;
	case 0x13: this.ST1(); break;
	case 0x23: this.ST2(); break;

	    // set memory bit
	case 0x87: this.SMB(0); break;
	case 0x97: this.SMB(1); break;
	case 0xa7: this.SMB(2); break;
	case 0xb7: this.SMB(3); break;
	case 0xc7: this.SMB(4); break;
	case 0xd7: this.SMB(5); break;
	case 0xe7: this.SMB(6); break;
	case 0xf7: this.SMB(7); break;
	    
	    // store A to mem
	case 0x85: this.STA_zp(); break;
	case 0x95: this.STA_zpx(); break;
	case 0x92: this.STA_ind(); break;
	case 0x81: this.STA_inx(); break;
	case 0x91: this.STA_iny(); break;
	case 0x8d: this.STA_abs(); break;
	case 0x9d: this.STA_abx(); break;
	case 0x99: this.STA_aby(); break;
	    
	    // store X to mem
	case 0x86: this.STX_zp(); break;
	case 0x96: this.STX_zpy(); break;
	case 0x8e: this.STX_abs(); break;
	    
	    // store Y to mem
	case 0x84: this.STY_zp(); break;
	case 0x94: this.STY_zpx(); break;
	case 0x8c: this.STY_abs(); break;
	    
	    // store Zero to mem
	case 0x64: this.STZ_zp(); break;
	case 0x74: this.STZ_zpx(); break;
	case 0x9c: this.STZ_abs(); break;
	case 0x9e: this.STZ_abx(); break;

	    // special bulk transfer
	case 0xf3: this.TAI(); break;
	    
	    // swap
	case 0x02: this.SXY(); break;

	    // special transfer
	case 0x53: this.TAM(); break;
	case 0xAA: this.TAX(); break;
	case 0xA8: this.TAY(); break;
	case 0xe3: this.TIA(); break;
	case 0xc3: this.TDD(); break;
	case 0xd3: this.TIN(); break;
	case 0x73: this.TII(); break;
	case 0x43: this.TMA(); break;

	    // test
	case 0x14: this.TRB_zp(); break;
	case 0x1c: this.TRB_abs(); break;
	    
	case 0x04: this.TSB_zp(); break;
	case 0x0c: this.TSB_abs(); break;

	case 0x83: this.TST_zp(); break;
	case 0xa3: this.TST_zpx(); break;
	case 0x93: this.TST_abs(); break;
	case 0xb3: this.TST_abx(); break;

	    // transfer
	case 0xba: this.TSX(); break;
	case 0x8a: this.TXA(); break;
	case 0x98: this.TYA(); break;
	case 0x9a: this.TXS(); break;
	    
	default:
	    this.decode = "***** Error illegal opcode " + Util.hex(this.currentaddr, 4) + ":" + Util.hex(this.current_opcode);
	    this.error = true;
	    console.log(this.decode);
	    this.PC = this.PC - 0x10;
	    this.dump();
	    this.abort = true;
	    break;
	    
	}


	// infinite check
	if(this.infinite_addr[0] == this.PC || this.infinite_addr[1]) {
	    this.infiniteloop = true;
	} else {
	    this.infinite_addr[this.infinite_check_index] = this.PC;
	    this.infinite_check_index = (this.infinite_check_index + 1) % 0x1;
	}
	
	if(CPU.debug) {
	    console.log("[" + ("0000000000" + this.ticks).slice(-10) + "]" + Util.hex(this.currentaddr, 4) + " " + this.decode + " [" + this.decode_raw+ "]");
	}

	if(CPU.debug){
	    //	    	    console.log(this.regdump_get_text());
	    //	    	    console.log(this.Mem.memdump_get_text(0x2000, 256));
	}


	
	return true;
    }


    store_work(value:number):void {
	this.work_value = value;
	this.decode = "";
    }
    
    read_work():void {
	let value = this.Mem.read(this.work_addr);
	if(this.imm){
	    this.decode_raw += Util.hex(value) + " ";
	}
	this.work_value = value;
	
	if(this.imm) {
	    this.decode += "#" + Util.hex(value, 2);
	}

	this.imm = false;
    }
    read_work2():void {
	let order = 0;
	let value = 0;
	for(let i = 0; i < 2; i ++) {
	    let v = this.Mem.read(this.work_addr + i);
	    if(this.imm){
		this.decode_raw += Util.hex(v) + " ";
	    }
	    value = value + v * Math.pow(256, order);
	    order = order + 1;
	}
	this.work_value = value;
	
	if(this.imm) {
	    this.decode += "#" + Util.hex(value, 4);
	}

	this.imm = false;
    }
    
    /*
    write_work(n:number=1):void {
	let value = this.work_value;
	for(let i = 0; i < n; i ++) {
	    let v = value & 0xff;
	    value = Math.floor(value / 256);
	    this.Mem.write(this.work_addr, v);
	}
    }
    */
    write_work():void {
	let value = this.work_value;
	this.Mem.write(this.work_addr, value);
    }
    
    addr_imm():void {
	
	this.work_addr = this.PC;
	this.PC = (this.PC + 1) & 0xffff;
	this.decode = "imm ";
	this.imm = true;

    }
    
    addr_imm2():void {
	let ll = this.Mem.read(this.PC);
	let hh = this.Mem.read(this.PC + 1);
	this.decode_raw += Util.hex(ll) + " " + Util.hex(hh) + " ";
	this.work_addr = (hh<<8)|ll;
	this.PC = (this.PC + 2) & 0xffff;
	this.decode = "imm " + Util.hex(this.work_addr,4);
	//	this.imm = true;

    }
    
    
    addr_zp():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(zz) + " ";
	let addr = CPU.ZEROPAGEBASE + zz;
	this.work_addr = addr;
	this.decode = "z"+Util.hex(zz);
    }
    
    addr_zpx():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(zz) + " ";
	let addr = CPU.ZEROPAGEBASE + ((zz + this.X)&0xff);
	this.work_addr = addr;
	this.decode = "z"+Util.hex(zz)+",X";
    }
    
    addr_zpy():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(zz) + " ";
	let addr = CPU.ZEROPAGEBASE + ((zz + this.Y)&0xff);
	this.work_addr = addr;
	this.decode = "z"+Util.hex(zz)+",Y";
    }
    
    addr_ind():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(zz) + " ";
	let addr = CPU.ZEROPAGEBASE + zz;
	let ll = this.Mem.read(addr);
	let hh = this.Mem.read(addr+1);
	this.work_addr = (hh<<8)|ll;
	this.decode = "(z"+Util.hex(zz)+")";
    }
    
    addr_inx():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	let addr = CPU.ZEROPAGEBASE + ((zz + this.X)&0xff);
	this.decode_raw += Util.hex(zz) + " ";
	let ll = this.Mem.read(addr);
	let hh = this.Mem.read(addr+1);
	this.work_addr = (hh<<8)|ll;
	this.decode = "(z"+Util.hex(zz)+",X)";
    }

    addr_iny():void {
	let zz = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	let addr = CPU.ZEROPAGEBASE + zz;
	this.decode_raw += Util.hex(zz) + " ";
	let ll = this.Mem.read(addr);
	let hh = this.Mem.read(addr+1);
	this.work_addr = ((hh<<8)|ll) +this.Y;
	this.decode = "(z"+Util.hex(zz)+"),Y";

	//	if(CPU.debug)console.log("work:"+Util.hex(this.work_addr,4));
	
    }
    
    addr_abs():void {
	let ll = this.Mem.read(this.PC);
	this.decode_raw += Util.hex(ll) + " ";
	this.PC = (this.PC + 1) & 0xffff;
	let hh = this.Mem.read(this.PC);
	this.decode_raw += Util.hex(hh) + " ";
	this.PC = (this.PC + 1) & 0xffff;
	this.work_addr = (hh<<8)|ll;
	this.decode = "$" + Util.hex(this.work_addr, 4);
    }
    
    addr_ain():void {
	let ll = this.Mem.read(this.PC);
	this.decode_raw += Util.hex(ll) + " ";
	let hh = this.Mem.read(this.PC + 1);
	this.decode_raw += Util.hex(hh) + " ";
	this.PC = (this.PC + 2) & 0xffff;
	
	let iaddr = ((hh<<8)|ll);
	this.decode = "$" + Util.hex(iaddr,4);
	
	let ll2 = this.Mem.read(iaddr);
	let hh2 = this.Mem.read(iaddr+1);
	this.work_addr = ((hh2<<8)|ll2);

    }
    
    addr_aix():void {
	let ll = this.Mem.read(this.PC);
	this.decode_raw += Util.hex(ll) + " ";
	let hh = this.Mem.read(this.PC + 1);
	this.decode_raw += Util.hex(hh) + " ";
	this.PC = (this.PC + 2) & 0xffff;
	
	let iaddr = ((hh<<8)|ll) + this.X;
	this.decode = "$" + Util.hex(iaddr,4) + ",X";
	
	let ll2 = this.Mem.read(iaddr);
	let hh2 = this.Mem.read(iaddr + 1);
	this.work_addr = ((hh2<<8)|ll2);

    }
    
    addr_abx():void {
	let ll = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(ll) + " ";
	let hh = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(hh) + " ";
	this.work_addr = ((hh<<8)|ll) +this.X;
	this.decode = "$" + Util.hex(this.work_addr, 4) + ",X";
    }
    
    addr_aby():void {
	let ll = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(ll) + " ";
	let hh = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(hh) + " ";
	this.work_addr = ((hh<<8)|ll) +this.Y;
	this.decode = "$" + Util.hex(this.work_addr, 4) + ",Y";
    }

    read_rr():void {
	let rr = this.Mem.read(this.PC);
	this.PC = (this.PC + 1) & 0xffff;
	this.decode_raw += Util.hex(rr) + " ";
	let signed_rr = rr > 128 ? rr - 256 : rr;
	this.work_rr = signed_rr;
	this.decode += "r"+this.work_rr;
    }

    read_direct(n:number=1):number {
	let ret = 0;
	let order = 0;
	for(let i = 0; i < n; i ++) {
	    let v = this.Mem.read(this.PC);
	    this.PC = (this.PC + 1) & 0xffff;
	    this.decode_raw += Util.hex(v) + " ";
	    ret = ret + v * Math.pow(256, order);
	    order = order + 1;
	}
	return ret;
    }


    push(value:number) {
	this.Mem.write(this.SP + CPU.STACKBASE, value);
	this.SP --;
	if(this.SP < 0) this.SP = 255;
    }

    pull():number {
	this.SP ++;
	if(this.SP > 255) this.SP = 0;
	return this.Mem.read(this.SP + CPU.STACKBASE);
    }


    
    ADC_imm():void {this.addr_imm(); this.ADC(); this.cycle(2);}
    ADC_zp():void {this.addr_zp(); this.ADC(); this.cycle(4);}
    ADC_zpx():void {this.addr_zpx(); this.ADC(); this.cycle(4);}
    ADC_ind():void {this.addr_ind(); this.ADC(); this.cycle(7);}
    ADC_inx():void {this.addr_inx(); this.ADC(); this.cycle(7);}
    ADC_iny():void {this.addr_iny(); this.ADC(); this.cycle(7);}
    ADC_abs():void {this.addr_abs(); this.ADC(); this.cycle(5);}
    ADC_abx():void {this.addr_abx(); this.ADC(); this.cycle(5);}
    ADC_aby():void {this.addr_aby(); this.ADC(); this.cycle(5);}
    ADC():void {
	this.read_work();

	let result = this.A + this.work_value + (this.flagC() == 0 ? 0 : 1);
	
	this.flagT0();
	if((result & 0xff) == 0) this.flagZ1(); else this.flagZ0();
	if(result > 255) this.flagC1(); else this.flagC0();
	if((result >= 128 && result < 256) ||
	   (result >= 128+256)) this.flagN1(); else this.flagN0();
	if(result >= 128) this.flagV1(); else this.flagV0();
	
	this.A = (result & 0xff);

	this.decode = "ADC " + this.decode;
    }

    
    AND_imm():void {this.addr_imm(); this.AND(); this.cycle(2);}
    AND_zp():void {this.addr_zp(); this.AND();  this.cycle(4);}
    AND_zpx():void {this.addr_zpx(); this.AND(); this.cycle(4);}
    AND_ind():void {this.addr_ind(); this.AND(); this.cycle(7);}
    AND_inx():void {this.addr_inx(); this.AND(); this.cycle(7);}
    AND_iny():void {this.addr_iny(); this.AND(); this.cycle(7);}
    AND_abs():void {this.addr_abs(); this.AND(); this.cycle(5);}
    AND_abx():void {this.addr_abx(); this.AND(); this.cycle(5);}
    AND_aby():void {this.addr_aby(); this.AND(); this.cycle(5);}
    AND():void {
	this.read_work();
	let result = (this.A & this.work_value);

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();

	this.A = result;
	this.decode = "AND " + this.decode;
    }

    ASL_zp():void {this.addr_zp(); this.read_work(); this.ASL(); this.write_work(); this.cycle(6);}
    ASL_zpx():void {this.addr_zpx(); this.read_work(); this.ASL(); this.write_work(); this.cycle(6);}
    ASL_abs():void {this.addr_abs(); this.read_work(); this.ASL(); this.write_work(); this.cycle(7);}
    ASL_abx():void {this.addr_abx(); this.read_work(); this.ASL(); this.write_work(); this.cycle(7);}
    ASL_acc():void {this.store_work(this.A); this.ASL(); this.A = this.work_value; this.cycle(2);}
    ASL():void {

	let result = (this.work_value << 1);
	
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	if(result > 255) this.flagC1(); else this.flagC0();

	this.work_value = (result & 0xff);
	this.decode = "ASL" + this.decode;
    }

    BBR(i:number):void {
	let test = 1 << i;
	this.addr_zp();
	this.read_work();
	this.read_rr();
	if((this.work_value & test) == 0) {
	    this.PC = (this.PC + this.work_rr) & 0xffff;
	}
	this.flagT0();
	this.decode = "BBR"+i+" " + this.decode;
	this.cycle(6);
    }
	    
    BCC():void {
	this.decode = "";
	this.read_rr();
	if(this.flagC() == 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BCC " + this.decode;
	this.cycle(2);
    }

    BBS(i:number):void {
	let test = 1 << i;
	this.addr_zp();
	this.read_work();
	this.read_rr();
	if((this.work_value & test) != 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BBS" + i + " " + this.decode;
	this.cycle(6);
    }

    BCS():void {
	this.decode = "";
	this.read_rr();
	if(this.flagC() != 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BCS " + this.decode;
	this.cycle(2);
    }

    BEQ():void {
	this.decode = "";
	this.read_rr();
	if(this.flagZ() != 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BEQ " + this.decode;
	this.cycle(2);
    }
	    
    BIT_imm():void {this.addr_imm(); this.BIT();  this.cycle(2);}
    BIT_zp():void {this.addr_zp(); this.BIT(); this.cycle(4);}
    BIT_zpx():void {this.addr_zpx(); this.BIT(); this.cycle(4);}
    BIT_abs():void {this.addr_abs(); this.BIT(); this.cycle(5);}
    BIT_abx():void {this.addr_abx(); this.BIT(); this.cycle(5);}
    BIT():void {
	this.read_work();
	let result = (this.work_value & this.A);
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((this.work_value & 0x80) != 0) this.flagN1(); else this.flagN0();
	if((this.work_value & 0x40) != 0) this.flagV1(); else this.flagV0();
	
	this.decode = "BIT " + this.decode;

    }

    BMI():void {
	this.decode = "";
	this.read_rr();
	if(this.flagN() != 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BMI" + this.decode;
	this.cycle(2);
    }
    
    BNE():void {
	this.decode = "";
	this.read_rr();
	if(this.flagZ() == 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BNE " + this.decode;
	this.cycle(2);
    }
    
    BPL():void {
	this.decode = "";
	this.read_rr();
	if(this.flagN() == 0) {
	    this.PC = ((this.PC + this.work_rr) & 0xffff);
	}
	this.flagT0();
	this.decode = "BPL" + this.decode;
	this.cycle(2);
    }


    BRA():void {
	this.decode = "";
	this.read_rr();
	this.PC = ((this.PC + this.work_rr) & 0xffff);
	this.decode = "BRA " + this.decode;
	this.flagT0();
	this.cycle(4);
    }
    
    BRK():void {
	this.decode = "";
	this.PC ++;
	this.push((this.PC & 0xff00) >> 8);
	this.push((this.PC & 0x00ff));
	this.push(this.P);
	let ll = this.Mem.read(CPU.IRQ2_VECTOR);
	let hh = this.Mem.read(CPU.IRQ2_VECTOR + 1);
	this.PC = ((hh<<8) | ll);
	this.flagT0();
	this.flagB1();
	this.flagD0();
	this.flagI1();
	this.decode = "BRK " + this.decode;
	this.cycle(8);
    }
    
    BSR():void {
	this.decode = "";
	this.read_rr();
	let paddr = this.PC - 1;
	this.push((paddr & 0xff00) >> 8);
	this.push((paddr & 0x00ff));

	//	this.PC = (paddr + 2 + this.work_rr) & 0xffff;
	this.PC = (paddr + 1 + this.work_rr) & 0xffff;
	this.flagT0();
	this.decode = "BSR";
	this.cycle(8);
    }
    
    BVC():void {
	this.read_rr();
	if(this.flagV() == 0) {
	    this.PC = (this.PC + this.work_rr) & 0xffff;
	}
	this.flagT0();
	this.decode = "BVC";
	this.cycle(2);
    }
    
    BVS():void {
	this.read_rr();
	if(this.flagV() != 0) {
	    this.PC = (this.PC + this.work_rr) & 0xffff;
	}
	this.flagT0();
	this.decode = "BVS";
	this.cycle(2);
    }
    
    CLC():void {
	this.flagC0();
	this.flagT0();
	this.decode = "CLC";
	this.cycle(2);
    }
    
    CLA():void {
	this.A = 0;
	this.flagT0();
	this.decode = "CLA";
	this.cycle(2);
    }
    
    CLD():void {
	this.flagD0();
	this.flagT0();
	this.decode = "CLD";
	this.cycle(2);
    }
    
    CLI():void {
	this.flagI0();
	this.flagT0();
	this.decode = "CLI";
	this.cycle(2);
    }
    
    CLV():void {
	this.flagV0();
	this.flagT0();
	this.decode = "CLV";
	this.cycle(2);
    }
    
    CLY():void {
	this.Y = 0;
	this.flagT0();
	this.decode = "CLY";
	this.cycle(2);
    }
    
    CLX():void {
	this.X = 0;
	this.flagT0();
	this.decode = "CLX";
	this.cycle(2);
    }
	    
    CPX_imm():void {this.addr_imm(); this.CPX(); this.cycle(2);}
    CPX_zp():void {this.addr_zp(); this.CPX(); this.cycle(4);}
    CPX_abs():void {this.addr_abs(); this.CPX(); this.cycle(5);}
    CPX():void {
	this.read_work();
	let result = this.X - this.work_value;

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if(result < 0) this.flagC0(); else this.flagC1();
	if(((result + 256)&0x80)!=0) this.flagN1(); else this.flagN0();
	
	this.decode = "CPX " + this.decode;
    }

    CSH():void {
	this.clockspeed = CPU.CLOCKSPEED_HIGH;
	this.decode = "CSH";
	this.cycle(0);
    }
    
    CSL():void {
	this.clockspeed = CPU.CLOCKSPEED_LOW;
	this.decode = "CSL";
	this.cycle(0);
    }
	    
    CMP_imm():void {this.addr_imm(); this.CMP(); this.cycle(2);}
    CMP_zp():void {this.addr_zp(); this.CMP(); this.cycle(4);}
    CMP_zpx():void {this.addr_zpx(); this.CMP(); this.cycle(4);}
    CMP_ind():void {this.addr_ind(); this.CMP(); this.cycle(7);}
    CMP_inx():void {this.addr_inx(); this.CMP(); this.cycle(7);}
    CMP_iny():void {this.addr_iny(); this.CMP(); this.cycle(7);}
    CMP_abs():void {this.addr_abs(); this.CMP(); this.cycle(5);}
    CMP_abx():void {this.addr_abx(); this.CMP(); this.cycle(5);}
    CMP_aby():void {this.addr_aby(); this.CMP(); this.cycle(5);}
    CMP():void {
	this.read_work();
	let result = this.A - this.work_value;

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if(result < 0) this.flagC0(); else this.flagC1();
	if((((result+256) & 0x80)!=0)) this.flagN1(); else this.flagN0();
	
	this.decode = "CMP " + this.decode;
    }
    
    DEX():void {
	this.X --;
	
	this.flagT0();
	if(this.X == 0) this.flagZ1(); else this.flagZ0();
	if(((this.X+256)&0x80)!=0) this.flagN1(); else this.flagN0();
	this.X = (this.X + 256) & 0xff;
	
	this.cycle(2);
	this.decode = "DEX";
    }


    DEC_zp():void {this.addr_zp(); this.read_work(); this.DEC(); this.write_work(); this.cycle(6);}
    DEC_zpx():void {this.addr_zpx(); this.read_work(); this.DEC(); this.write_work(); this.cycle(6);}
    DEC_abs():void {this.addr_abs(); this.read_work(); this.DEC(); this.write_work(); this.cycle(7);}
    DEC_abx():void {this.addr_abx(); this.read_work(); this.DEC(); this.write_work(); this.cycle(7);}
    DEC_acc():void {this.store_work(this.A); this.DEC(); this.A = this.work_value; this.cycle(2);}
    DEC():void {
	let result = this.work_value - 1;

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if(((result+256)&0x80) != 0) this.flagN1(); else this.flagN0();

	this.work_value = ((result + 256) & 0xff);
	
	this.decode = "DEC " + this.decode;
    }

	    
    CPY_imm():void {this.addr_imm(); this.CPY(); this.cycle(2);}
    CPY_zp():void {this.addr_zp(); this.CPY(); this.cycle(4);}
    CPY_abs():void {this.addr_abs(); this.CPY(); this.cycle(5);}
    CPY():void {
	this.read_work();
	let result = this.Y - this.work_value;

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if(result < 0) this.flagC0(); else this.flagC1();
	if(((result+256)&0x80)!= 0) this.flagN1(); else this.flagN0();

	this.decode = "CPY " + this.decode;
    }

    EOR_imm():void {this.addr_imm(); this.EOR(); this.cycle(2);}
    EOR_zp():void {this.addr_zp(); this.EOR(); this.cycle(4);}
    EOR_zpx():void {this.addr_zpx(); this.EOR(); this.cycle(4);}
    EOR_ind():void {this.addr_ind(); this.EOR(); this.cycle(7);}
    EOR_inx():void {this.addr_inx(); this.EOR(); this.cycle(7);}
    EOR_iny():void {this.addr_iny(); this.EOR(); this.cycle(7);}
    EOR_abs():void {this.addr_abs(); this.EOR(); this.cycle(5);}
    EOR_abx():void {this.addr_abx(); this.EOR(); this.cycle(5);}
    EOR_aby():void {this.addr_aby(); this.EOR(); this.cycle(5);}
    EOR():void {
	this.read_work();
	let result = (this.A ^ this.work_value);
	
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	
	this.A = (result & 0xff);
	this.decode = "EOR " + this.decode;
    }

    INC_zp():void {this.addr_zp(); this.read_work(); this.INC(); this.write_work(); this.cycle(6);}
    INC_zpx():void {this.addr_zpx(); this.read_work(); this.INC(); this.write_work(); this.cycle(6);}
    INC_abs():void {this.addr_abs(); this.read_work(); this.INC(); this.write_work(); this.cycle(7);}
    INC_abx():void {this.addr_abx(); this.read_work(); this.INC(); this.write_work(); this.cycle(7);}
    INC_acc():void {this.store_work(this.A); this.INC(); this.A = this.work_value; this.cycle(2);}
    INC():void {
	let result = this.work_value + 1;

	this.flagT0();
	if((result&0xff) == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();

	this.work_value = (result & 0xff);
	this.decode = "INC " + this.decode;
    }
	    
    INX():void {
	this.X ++;
	
	this.flagT0();
	if((this.X & 0xff) == 0) this.flagZ1(); else this.flagZ0();
	if((this.X & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.X = (this.X & 0xff);

	this.decode = "INX";
	this.cycle(2);
    }
	    
    DEY():void {
	this.Y --;
	
	this.flagT0();
	if(this.Y == 0) this.flagZ1(); else this.flagZ0();
	if(((this.Y+256)&0x80) != 0) this.flagN1(); else this.flagN0();
	this.Y = ((this.Y + 256) & 0xff);

	this.decode = "DEY";
	this.cycle(2);
    }

    INY():void {
	this.Y ++;

	this.flagT0();
	if(this.Y == 256) this.flagZ1(); else this.flagZ0();
	if((this.Y & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.Y = (this.Y & 0xff);

	this.decode = "INY";
	this.cycle(2);
    }

    JMP_abs():void {this.addr_imm2();this.JMP();this.cycle(4);}
    JMP_ain():void {this.addr_ain();this.JMP();	this.cycle(7);}
    JMP_aix():void {this.addr_aix();this.JMP();	this.cycle(7);}
    JMP():void {
	this.PC = this.work_addr;
	this.flagT0();
	this.decode = "JMP " + this.decode;
    }

    JSR():void {
	this.addr_imm2();
	let paddr = this.PC - 1;
	this.push(((paddr&0xff00)>>8));
	this.push((paddr&0x00ff));

	this.PC = this.work_addr;
	this.flagT0();
	this.cycle(7);
	this.decode = "JSR " + this.decode;
    }


    LDA_imm():void {this.addr_imm(); this.LDA(); this.cycle(2);}
    LDA_zp():void {this.addr_zp(); this.LDA(); this.cycle(4);}
    LDA_zpx():void {this.addr_zpx(); this.LDA(); this.cycle(4);}
    LDA_ind():void {this.addr_ind(); this.LDA(); this.cycle(7);}
    LDA_inx():void {this.addr_inx(); this.LDA(); this.cycle(7);}
    LDA_iny():void {this.addr_iny(); this.LDA(); this.cycle(7);}
    LDA_abs():void {this.addr_abs(); this.LDA(); this.cycle(5);}
    LDA_abx():void {this.addr_abx(); this.LDA(); this.cycle(5);}
    LDA_aby():void {this.addr_aby(); this.LDA(); this.cycle(5);}
    LDA():void {
	this.read_work();
	this.A = this.work_value;
	this.flagT0();
	if(this.A == 0) this.flagZ1(); else this.flagZ0();
	if((this.A & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.decode = "LDA " + this.decode;
    }

    LDX_imm():void {this.addr_imm(); this.LDX(); this.cycle(2);}
    LDX_zp():void {this.addr_zp(); this.LDX(); this.cycle(4);}
    LDX_zpy():void {this.addr_zpy(); this.LDX(); this.cycle(4);}
    LDX_abs():void {this.addr_abs(); this.LDX(); this.cycle(5);}
    LDX_aby():void {this.addr_aby(); this.LDX(); this.cycle(5);}
    LDX():void {
	this.read_work();
	this.X = this.work_value;
	this.flagT0();
	if(this.X == 0) this.flagZ1(); else this.flagZ0();
	if((this.X & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.decode = "LDX " + this.decode;
    }
    
    LDY_imm():void {this.addr_imm(); this.LDY(); this.cycle(2);}
    LDY_zp():void {this.addr_zp(); this.LDY(); this.cycle(4);}
    LDY_zpx():void {this.addr_zpx(); this.LDY(); this.cycle(4);}
    LDY_abs():void {this.addr_abs(); this.LDY(); this.cycle(5);}
    LDY_abx():void {this.addr_abx(); this.LDY(); this.cycle(5);}
    LDY():void {
	this.read_work();
	this.Y = this.work_value;
	this.flagT0();
	if(this.Y == 0) this.flagZ1(); else this.flagZ0();
	if((this.Y & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.decode = "LDY " + this.decode;
    }

    LSR_zp():void {this.addr_zp(); this.read_work(); this.LSR(); this.write_work(); this.cycle(6);}
    LSR_zpx():void {this.addr_zpx(); this.read_work(); this.LSR(); this.write_work(); this.cycle(6);}
    LSR_abs():void {this.addr_abs(); this.read_work(); this.LSR(); this.write_work(); this.cycle(7);}
    LSR_abx():void {this.addr_abx(); this.read_work(); this.LSR(); this.write_work(); this.cycle(7);}
    LSR_acc():void {this.store_work(this.A); this.LSR(); this.A = this.work_value;; this.cycle(2);}
    LSR():void {
	let result = (this.work_value >> 1);
	
	this.flagT0();
	if((this.work_value & 0x01) != 0) this.flagC1(); else this.flagC0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.work_value = (result & 0xff);
	this.decode = "LSR " + this.decode;
    }
	    
    ORA_imm():void {this.addr_imm(); this.ORA(); this.cycle(2);}
    ORA_zp():void {this.addr_zp(); this.ORA(); this.cycle(4);}
    ORA_zpx():void {this.addr_zpx(); this.ORA(); this.cycle(4);}
    ORA_ind():void {this.addr_ind(); this.ORA(); this.cycle(7);}
    ORA_inx():void {this.addr_inx(); this.ORA(); this.cycle(7);}
    ORA_iny():void {this.addr_iny(); this.ORA(); this.cycle(7);}
    ORA_abs():void {this.addr_abs(); this.ORA(); this.cycle(5);}
    ORA_abx():void {this.addr_abx(); this.ORA(); this.cycle(5);}
    ORA_aby():void {this.addr_aby(); this.ORA(); this.cycle(5);}
    ORA():void {
	this.read_work();
	let result = (this.A | this.work_value);

	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	
	this.A = (result & 0xff);
	this.decode = "ORA " + this.decode;
    }

    NOP():void {
	this.decode = "NOP";
	this.cycle(2);
    }
	    
    PHA():void {
	this.push(this.A);
	this.decode = "PHA";
	this.cycle(3);
    }
    
    PHP():void {
	this.push(this.P);
	this.decode = "PHP";
	this.cycle(3);
    }
    PHX():void {
	this.push(this.X);
	this.decode = "PHX";
	this.cycle(3);
    }
    PHY():void {
	this.push(this.Y);
	this.decode = "PHY";
	this.cycle(3);
    }
    PLA():void {
	this.A = this.pull();
	this.decode = "PLA";
	this.cycle(4);
    }
    PLP():void {
	this.P = this.pull();
	this.decode = "PLP";
	this.cycle(4);
    }
    PLX():void {
	this.X = this.pull();
	this.decode = "PLX";
	this.cycle(4);
    }
    PLY():void {
	this.Y = this.pull();
	this.decode = "PLY";
	this.cycle(4);
    }
	    

    ROL_zp():void {this.addr_zp(); this.read_work(); this.ROL(); this.write_work(); this.cycle(6);}
    ROL_zpx():void {this.addr_zpx(); this.read_work(); this.ROL(); this.write_work(); this.cycle(6);}
    ROL_abs():void {this.addr_abs(); this.read_work(); this.ROL(); this.write_work(); this.cycle(7);}
    ROL_abx():void {this.addr_abx(); this.read_work(); this.ROL(); this.write_work(); this.cycle(7);}
    ROL_acc():void {this.store_work(this.A); this.ROL(); this.A = this.work_value; this.cycle(2);}
    ROL():void {
	let lsb = (this.flagC() == 0 ? 0 : 1);
	let carry = this.work_value & 0x80;
	let result = ((this.work_value << 1)| lsb);

	this.flagT0();
	if(carry != 0) this.flagC1(); else this.flagC0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	
	this.work_value = (result & 0xff);
	this.decode = "ROL" + this.decode;
    }

    RMB(i:number):void {
	let v = ~(1 << i);
	
	this.addr_zp();
	this.read_work();
	let result = (v & this.work_value);
	this.work_value = result;
	this.write_work();
	
	this.flagT0();
	
	this.cycle(7);
	this.decode = "RMB" + i + " " + this.decode;
    }
	    
    ROR_zp():void {this.addr_zp(); this.read_work(); this.ROR(); this.write_work(); this.cycle(6);}
    ROR_zpx():void {this.addr_zpx(); this.read_work(); this.ROR(); this.write_work(); this.cycle(6);}
    ROR_abs():void {this.addr_abs(); this.read_work(); this.ROR(); this.write_work(); this.cycle(7);}
    ROR_abx():void {this.addr_abx(); this.read_work(); this.ROR(); this.write_work(); this.cycle(7);}
    ROR_acc():void {this.store_work(this.A); this.ROR(); this.A = this.work_value; this.cycle(2);}
    ROR():void {
	let msb = this.flagC() == 0 ? 0 : 0x80;
	let lsb = (this.work_value & 0x01);
	let result = (msb | (this.work_value >> 1));

	this.flagT0();
	if(lsb != 0) this.flagC1(); else this.flagC0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if((result & 0x80) != 0) this.flagN1(); else this.flagN0();
	this.work_value = (result & 0xff);
	this.decode = "ROR" + this.decode;
    }

    RTI():void {
	let flag = this.pull();
	this.P = flag;
	let ll = this.pull();
	let hh = this.pull();
	let addr = ((hh<<8)|ll);
	this.PC = addr;

	this.cycle(7);
	this.decode = "RTI";
    }
    
    RTS():void {
	let ll = this.pull();
	let hh = this.pull();
	let addr = ((hh<<8)|ll);
	this.PC = addr + 1;
	this.flagT0();
	this.cycle(7);
	this.decode = "RTS";
    }
    
    SAX():void {
	let swap = this.A;
	this.A = this.X;
	this.X = swap;
	this.flagT0();
	this.decode = "SAX";
	this.cycle(3);
    }
    SAY():void {
	let swap = this.A;
	this.A = this.Y;
	this.Y = swap;
	this.flagT0();
	this.decode = "SAY";
	this.cycle(3);
    }
    

    SBC_imm():void {this.addr_imm(); this.SBC(); this.cycle(2);}
    SBC_zp():void {this.addr_zp(); this.SBC(); this.cycle(4);}
    SBC_zpx():void {this.addr_zpx(); this.SBC(); this.cycle(4);}
    SBC_ind():void {this.addr_ind(); this.SBC(); this.cycle(7);}
    SBC_inx():void {this.addr_inx(); this.SBC(); this.cycle(7);}
    SBC_iny():void {this.addr_iny(); this.SBC(); this.cycle(7);}
    SBC_abs():void {this.addr_abs(); this.SBC(); this.cycle(5);}
    SBC_abx():void {this.addr_abx(); this.SBC(); this.cycle(5);}
    SBC_aby():void {this.addr_aby(); this.SBC(); this.cycle(5);}
    SBC():void {
	this.read_work();
	let carry = this.flagC() != 0 ? 0 : 1;
	let result = this.A - this.work_value - carry;

	this.flagT0();
	if(result < 0) this.flagC0(); else this.flagC1();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	if(((result+256)&0x80) != 0) this.flagN1(); else this.flagN0();
	if(result < -128
	   ||result >= 128) this.flagV1(); else this.flagV0();
	
	this.A = ((result + 256) & 0xff);
	
	this.decode = "SBC " + this.decode;
    }
    
    SED():void {
	this.flagD1();
	this.decode = "SED";
	this.cycle(2);
    }
    
    SEC():void {
	this.flagC1();
	this.decode = "SEC";
	this.cycle(2);
    }
    SEI():void {
	this.flagI1();
	this.decode = "SEI";
	this.cycle(2);
    }
    SET():void {
	this.flagT1();
	this.decode = "SET";
	this.cycle(2);
    }

    ST0():void {
	this.addr_imm();
	this.read_work();
	this.Mem.hardware.gpu.write(0, this.work_value);
	this.flagT0();
	this.decode = "ST0 " + this.decode;
	this.cycle(4);
    }
    ST1():void {
	this.addr_imm();
	this.read_work();
	this.Mem.hardware.gpu.write(2, this.work_value);
	this.flagT0();
	this.decode = "ST1 " + this.decode;
	this.cycle(4);
    }
    ST2():void {
	this.addr_imm();
	this.read_work();
	this.Mem.hardware.gpu.write(3, this.work_value);
	this.flagT0();
	this.decode = "ST2 " + this.decode;
	this.cycle(4);
    }

	    
    SMB(i:number):void {
	let v = 1 << i;
	
	this.addr_zp();
	this.read_work();
	let result = (v | this.work_value);
	this.work_value = result;
	this.write_work();
	
	this.flagT0();
	this.decode = "SMB"+i +" " + this.decode;
	this.cycle(7);
    }
	    
    STA_zp():void {this.addr_zp(); this.STA(); this.cycle(4);}
    STA_zpx():void {this.addr_zpx(); this.STA(); this.cycle(4);}
    STA_ind():void {this.addr_ind(); this.STA(); this.cycle(7);}
    STA_inx():void {this.addr_inx(); this.STA(); this.cycle(7);}
    STA_iny():void {this.addr_iny(); this.STA(); this.cycle(7);}
    STA_abs():void {this.addr_abs(); this.STA(); this.cycle(5);}
    STA_abx():void {this.addr_abx(); this.STA(); this.cycle(5);}
    STA_aby():void {this.addr_aby(); this.STA(); this.cycle(5);}
    STA():void {
	this.work_value = this.A;
	this.write_work();
	this.flagT0();
	this.decode = "STA " + this.decode;
    }

    STX_zp():void {this.addr_zp(); this.STX(); this.cycle(4);}
    STX_zpy():void {this.addr_zpy(); this.STX(); this.cycle(4);}
    STX_abs():void {this.addr_abs(); this.STX(); this.cycle(5);}
    STX():void {
	this.work_value = this.X;
	this.write_work();
	this.flagT0();
	this.decode = "STX " + this.decode;
    }
    
    STY_zp():void {this.addr_zp(); this.STY(); this.cycle(4);}
    STY_zpx():void {this.addr_zpx(); this.STY(); this.cycle(4);}
    STY_abs():void {this.addr_abs(); this.STY(); this.cycle(5);}
    STY():void {
	this.work_value = this.Y;
	this.write_work();
	this.flagT0();
	this.decode = "STY " + this.decode;
    }
    
    STZ_zp():void {this.addr_zp(); this.STZ(); this.cycle(4);}
    STZ_zpx():void {this.addr_zpx(); this.STZ(); this.cycle(4);}
    STZ_abs():void {this.addr_abs(); this.STZ(); this.cycle(5);}
    STZ_abx():void {this.addr_abx(); this.STZ(); this.cycle(5);}
    STZ():void {
	this.work_value = 0;
	this.write_work();
	this.flagT0();
	this.decode = "STZ " + this.decode;
    }
    
    TAI():void {
	let src = this.read_direct(2);
	let dest = this.read_direct(2);
	let len = this.read_direct(2);
	this.decode = "TAI " +
	    "$"+Util.hex(src,4) +
	    " $"+Util.hex(dest,4) +
	    " #"+Util.hex(len,4) ;
	for(let i = 0; i < len; i ++) {
	    let tmp = this.Mem.read(src + (i & 0x1));
	    this.Mem.write(dest, tmp);
	    dest ++;
	}
	this.flagT0();
	this.cycle(6 * len + 17); // 17 + 6x
    }

    SXY():void {
	let swap = this.X;
	this.X = this.Y;
	this.Y = swap;
	this.flagT0();
	this.decode = "SXY";
	this.cycle(3);
    }
    
    TAM():void {
	this.addr_imm();
	this.read_work();
	let test:number = 1;
	for(let i = 0 ;i < 8; i ++) {
	    if((this.work_value & test) != 0) {
		this.Mem.MPR[i] = this.A;
	    }
	    test = test << 1;
	}
	this.decode = "TAM " + this.decode;
	this.flagT0();
	this.cycle(5);
    }

    TAX():void {
	this.X = this.A;
	if(this.X == 0){this.flagZ1();} else {this.flagZ0();}
	if((this.X & 0x80) != 0){this.flagN1();} else {this.flagN0();}
	this.flagT0();
	this.decode = "TAX";
	this.cycle(2);
    }

    TAY():void {
	this.Y = this.A;
	if(this.Y == 0){this.flagZ1();} else {this.flagZ0();}
	if((this.Y & 0x80) != 0){this.flagN1();} else {this.flagN0();}
	this.flagT0();
	this.decode = "TAY";
	this.cycle(2);
    }
    
    TIA():void {
	let src = this.read_direct(2);
	let dest = this.read_direct(2);
	let len = this.read_direct(2);
	this.decode = "TIA " +
	    "$"+Util.hex(src,4) +
	    " $"+Util.hex(dest,4) +
	    " #"+Util.hex(len,4) ;
	for(let i = 0; i < len; i ++) {
	    let tmp = this.Mem.read(src);
	    this.Mem.write(dest + (i & 0x1), tmp);
	    src ++;
	}
	this.flagT0();
	this.cycle(6 * len + 17); // 17 + 6x
    }
    
    TDD():void {
	let src = this.read_direct(2);
	let dest = this.read_direct(2);
	let len = this.read_direct(2);
	this.decode = "TDD " +
	    "$"+Util.hex(src,4) +
	    " $"+Util.hex(dest,4) +
	    " #"+Util.hex(len,4) ;
	for(let i = 0; i < len; i ++) {
	    let tmp = this.Mem.read(src);
	    this.Mem.write(dest, tmp);
	    src --;
	    dest --;
	}
	this.flagT0();
	this.cycle(6 * len + 17); // 17 + 6x
    }
    
    TIN():void {
	let src = this.read_direct(2);
	let dest = this.read_direct(2);
	let len = this.read_direct(2);
	this.decode = "TIN " +
	    "$"+Util.hex(src,4) +
	    " $"+Util.hex(dest,4) +
	    " #"+Util.hex(len,4) ;
	for(let i = 0; i < len; i ++) {
	    let tmp = this.Mem.read(src);
	    this.Mem.write(dest, tmp);
	    src ++;
	}
	this.flagT0();
	this.cycle(6 * len + 17); // 17 + 6x
    }
    
    TII():void {
	let src = this.read_direct(2);
	let dest = this.read_direct(2);
	let len = this.read_direct(2);
	this.decode = "TII " +
	    "$"+Util.hex(src,4) +
	    " $"+Util.hex(dest,4) +
	    " #"+Util.hex(len,4) ;
	for(let i = 0; i < len; i ++) {
	    let tmp = this.Mem.read(src);
	    this.Mem.write(dest, tmp);
	    src ++;
	    dest ++;
	}
	this.flagT0();
	this.cycle(6 * len + 17); // 17 + 6x
    }
    
    TMA():void {
	this.addr_imm();
	this.read_work();
	let test:number = 1;
	for(let i = 0 ;i < 8; i ++) {
	    if((this.work_value & test) != 0) {
		this.A = this.Mem.MPR[i];
	    }
	    test = test << 1;
	}
	this.decode = "TMA " + this.decode;
	this.flagT0();
	this.cycle(4);
    }
    
    TRB_zp():void {this.addr_zp(); this.TRB(); this.cycle(6);}
    TRB_abs():void {this.addr_abs(); this.TRB(); this.cycle(7);}
    TRB():void {
	this.read_work();
	let result = (this.work_value & (~this.A));
	if((this.work_value & 0x80) != 0) this.flagN1(); else this.flagN0();
	if((this.work_value & 0x40) != 0) this.flagV1(); else this.flagV0();
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	this.work_value = result;
	this.write_work();
	this.decode = "TRB " + this.decode;
    }
    
    TSB_zp():void {this.addr_zp(); this.TSB(); this.cycle(6);}
    TSB_abs():void {this.addr_abs(); this.TSB(); this.cycle(7);}
    TSB():void {
	this.read_work();
	let result = (this.work_value | this.A);
	if((this.work_value & 0x80) != 0) this.flagN1(); else this.flagN0();
	if((this.work_value & 0x40) != 0) this.flagV1(); else this.flagV0();
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	this.work_value = result;
	this.write_work();
	this.decode = "TSB " + this.decode;
    }
    
    TST_zp():void {this.addr_imm(); this.read_work(); let v = this.work_value; this.addr_zp(); this.TST(v); this.cycle(6);}
    TST_zpx():void {this.addr_imm(); this.read_work(); let v = this.work_value; this.addr_zpx(); this.TST(v); this.cycle(6);}
    TST_abs():void {this.addr_imm(); this.read_work(); let v = this.work_value;this.addr_abs(); this.TST(v); this.cycle(7);}
    TST_abx():void {this.addr_imm(); this.read_work(); let v = this.work_value;this.addr_abx(); this.TST(v); this.cycle(7);}
    TST(v:number):void {
	this.read_work();	
	let mv = this.work_value;
	let result = (v & mv);
	if((this.work_value & 0x80) != 0) this.flagN1(); else this.flagN0();
	if((this.work_value & 0x40) != 0) this.flagV1(); else this.flagV0();
	this.flagT0();
	if(result == 0) this.flagZ1(); else this.flagZ0();
	this.decode = "TST " + this.decode;
    }
    
    TSX():void {
	this.X = this.SP;
	if(this.SP == 0){this.flagZ1();} else {this.flagZ0();}
	if((this.SP & 0x80) != 0){this.flagN1();} else {this.flagN0();}
	this.flagT0();
	this.decode = "TSX";
	this.cycle(2);
    }
    
    TXA():void {
	this.A = this.X;
	if(this.A == 0){this.flagZ1();} else {this.flagZ0();}
	if((this.A & 0x80) != 0){this.flagN1();} else {this.flagN0();}
	this.flagT0();
	this.decode = "TXA";
	this.cycle(2);
    }
    
    TXS():void {
	this.SP = this.X;
	this.flagT0();
	this.decode = "TXS";
	this.cycle(2);
    }
    
    TYA():void {
	this.A = this.Y;
	if(this.A == 0){this.flagZ1();} else {this.flagZ0();}
	if((this.A & 0x80) != 0){this.flagN1();} else {this.flagN0();}
	this.flagT0();
	this.decode = "TYA";
	this.cycle(2);
    }
}



export class System {
    static BASE_CLOCK:number = 3579545;
    cpu:CPU;
    mem:MemoryController;
    ram:RAM;
    rom:ROM;
    hardware:Hardware;
    timer:Timer;
    gamepad:GamePad;
    mask:InterruptMask;
    gpu:GPU;
    pal:Pal;
    psg:PSG;
    
    constructor() {
	this.cpu = new CPU();
	this.mem = new MemoryController();
	this.ram = new RAM();
	this.rom = new ROM();
	this.hardware = new Hardware();
	this.timer = new Timer();
	this.gamepad = new GamePad();
	this.mask = new InterruptMask();
	this.gpu = new GPU();
	this.pal = new Pal();
	this.psg = new PSG();

	this.hardware.attach(this.timer,
			     this.gamepad,
			     this.mask,
			     this.gpu,
			     this.pal,
			     this.psg);
	
	this.mem.attach(this.rom,
			this.ram,
			this.hardware);
	
	this.cpu.attach(this.mem);
    }

    is_ready():boolean {
	return this.rom.memory != null;
    }

    load(romimage:number[]) {
	this.rom.attach(romimage);
	this.cpu.reset();
    }

    unload() {
	this.rom.memory = null;
    }

    run(ms:number) {
	let step = Math.floor(System.BASE_CLOCK*2 * ms / 1000);
	this.cpu.step(step);
    }

    get_pixel(x:number, y:number):Color {
	let index = this.gpu.get_bitmap_index(x, y);
	
	let c = this.pal.get_color(index);

	if(c == undefined) {
	    console.log("index "+index+" "+x+"/"+y);
	}
	
	//	console.log(c);
	return c;
    }

    fill_screen(x:number, y:number, w:number, h:number, buf:Uint8ClampedArray):void {
	
	let addr = 0;
	let dy;
	let dx;
	let wx = this.gpu.mwr_size_w*8-1;
	let wy = this.gpu.mwr_size_h*8-1;
	if(wx == 0 || wy == 0) return;
	for(let j = 0; j < h; j ++) {
	    dy = this.gpu.byr + j + y;
	    dx = this.gpu.bxr + x;
	    for(let i = 0; i < w; i ++) {
		let index = this.gpu.get_bitmap_index(dx&wx, dy&wy);
		dx = dx + 1;
		let c = this.pal.get_color(index);
		buf[addr] = c.r;
		addr = addr + 1;
		buf[addr] = c.g;
		addr = addr + 1;
		buf[addr] = c.b;
		addr = addr + 1;
		buf[addr] = 255; // a
		addr = addr + 1;
	    }
	}
    }

    gamepad_A_on(player:number=0) {this.gamepad.player[player].A = GamePadButton.PAD_ON;}
    gamepad_A_off(player:number=0) {this.gamepad.player[player].A = GamePadButton.PAD_OFF;}
    gamepad_B_on(player:number=0) {this.gamepad.player[player].B = GamePadButton.PAD_ON;}
    gamepad_B_off(player:number=0) {this.gamepad.player[player].B = GamePadButton.PAD_OFF;}
    gamepad_START_on(player:number=0) {this.gamepad.player[player].START = GamePadButton.PAD_ON;}
    gamepad_START_off(player:number=0) {this.gamepad.player[player].START = GamePadButton.PAD_OFF;}
    gamepad_SELECT_on(player:number=0) {this.gamepad.player[player].SELECT = GamePadButton.PAD_ON;}
    gamepad_SELECT_off(player:number=0) {this.gamepad.player[player].SELECT = GamePadButton.PAD_OFF;}
    gamepad_UP_on(player:number=0) {this.gamepad.player[player].UP = GamePadButton.PAD_ON;}
    gamepad_UP_off(player:number=0) {this.gamepad.player[player].UP = GamePadButton.PAD_OFF;}
    gamepad_DOWN_on(player:number=0) {this.gamepad.player[player].DOWN = GamePadButton.PAD_ON;}
    gamepad_DOWN_off(player:number=0) {this.gamepad.player[player].DOWN = GamePadButton.PAD_OFF;}
    gamepad_LEFT_on(player:number=0) {this.gamepad.player[player].LEFT = GamePadButton.PAD_ON;}
    gamepad_LEFT_off(player:number=0) {this.gamepad.player[player].LEFT = GamePadButton.PAD_OFF;}
    gamepad_RIGHT_on(player:number=0) {this.gamepad.player[player].RIGHT = GamePadButton.PAD_ON;}
    gamepad_RIGHT_off(player:number=0) {this.gamepad.player[player].RIGHT = GamePadButton.PAD_OFF;}
    
    
    
}
