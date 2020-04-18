// https://github.com/marcrobledo/acnl-editor/blob/master/js/editor_garden.js

//TODO
//Turnip prices
//Encyclopedia?
//Gender
//Villagers
//native fruit
//tpc regions (need to research)

import save_offsets from "./offsets.js";
import villager_data from "./villagers.js";

export default function SaveManager(_save_file_contents) {
	this.players = [];
	this.town = {};

	const _readStr = (ptr, len) => {
		ptr /= 2; //from 8bit, to 16
		const buffer = new Uint16Array(_save_file_contents);

		let ret = "";
		for(let i = 0; i < len; i++, ptr++) {
			const charcode = buffer[ptr];
			if(charcode === 0) break;
			ret += String.fromCharCode(charcode);
		}

		return ret;
	}

	const _readUint8 = (ptr) => {
		return (new Uint8Array(_save_file_contents))[ptr];
	}

	const _readUint16 = (ptr) => {
		return (new Uint16Array(_save_file_contents))[ptr/2];
	}

	const _readUint32 = (ptr) => {
		return (new Uint32Array(_save_file_contents))[ptr/4];
	}

	const _readEncryptedValue = (ptr) => {
		const int1 = _readUint32(ptr);
		const int2 = _readUint32(ptr+4);

		// Unpack 64-bit value into (u32, u16, u8, u8) values.
		var enc = int1;
		var adjust = int2 & 0xffff;
		var shift_val = (int2 >>> 16) & 0xff;
		var chk = (int2 >>> 24) & 0xff;

		// Validate 8-bit checksum
		if ((((enc >>> 0) + (enc >>> 8) + (enc >>> 16) + (enc >>> 24) + 0xba) & 0xff) != chk){
			console.error('invalid numeric value checksum');
			return 0;
		}
		var left_shift = (0x1c - shift_val) & 0xff;
		var right_shift = 0x20 - left_shift;
		if (left_shift < 0x20){
			/* general case */
			return ((((enc << left_shift)>>>0) + (enc >>> right_shift)) - (adjust + 0x8f187432));
		}else{
			/* handle error case: Invalid shift value */
			console.error('invalid shift for numeric value');
			return 0 + ((enc << right_shift) >>> 0) - ((adjust + 0x8f187432) >>> 0);
		}
	}

	{ //constructor
		for(let i = 0; i < 4; i++) {
			const player = {}
			const base_offset = save_offsets.PLAYERS + (save_offsets.PLAYER_SIZE * i);

			player.name = _readStr(base_offset + save_offsets.PLAYER_NAME, 8);
			if(!player.name) continue;
			player.gender = (_readUint8(base_offset + save_offsets.PLAYER_GENDER)) ? "Female" : "Male";
			player.playtime = _readUint32(base_offset + save_offsets.PLAYER_PLAYTIME);
			player.tpc = {
				"text": _readStr(base_offset + save_offsets.PLAYER_TPCTEXT, 32),
				"region": _readUint8(base_offset + save_offsets.PLAYER_TPCREGION),
				"pic": (() => {
					let offset=base_offset + save_offsets.PLAYER_TPCPIC;

					if( (_readUint32(offset) & 0x00ffffff ) == 0x00ffd8ff) {
						let base64 = "";
						for(let j = 0; j < 0x1400 && _readUint16(offset+j) != 0xffd9; j++) {
							base64 += String.fromCharCode( _readUint8(offset+j) );
						}
						base64 += String.fromCharCode(0xff);
						base64 += String.fromCharCode(0xd9);
						return "data:image/jpg;base64," + window.btoa(base64);
					} else {
						return "";
					}
				})(),
				"dream_address": (() => {
					const format = (num) => {
						return ("0000" + num.toString(16)).substr(-4);
					};
					const three = format( _readUint16(base_offset + save_offsets.PLAYER_DREAMCODE) );
					const two = format( _readUint16(base_offset + save_offsets.PLAYER_DREAMCODE+2) );
					const one = format( (_readUint8(base_offset + save_offsets.PLAYER_DREAMCODE+9) << 8) );
					return `${one}-${two}-${three}`.toUpperCase();
				})()
			}

			{
				const yyyy = _readUint16(base_offset + save_offsets.PLAYER_REGYEAR);
				const mm = _readUint8(base_offset + save_offsets.PLAYER_REGMONTH);
				const dd = _readUint8(base_offset + save_offsets.PLAYER_REGDAY);
				player.registration = new Date(`${yyyy}-${mm}-${dd}`);
			}

			{
				const yyyy = new Date().getFullYear();
				const mm = _readUint8(base_offset + save_offsets.PLAYER_BIRTHDAYMONTH);
				const dd = _readUint8(base_offset + save_offsets.PLAYER_BIRTHDAYDAY);
				const bday = new Date(`${yyyy}-${mm}-${dd}`);
				if(bday - new Date() < 0) bday.setFullYear(yyyy+1); //if passed, but not today
				player.birthday = bday;
			}
			this.players.push(player);
		}

		this.town.name = _readStr(save_offsets.TOWN_NAME, 8);
		this.town.native_fruit = (() => {
			const fruits = ["???", "Apple", "Orange", "Pear", "Peach", "Cherry"];
			return fruits[_readUint8(save_offsets.TOWN_NATIVEFRUIT)];
		})();
		this.town.ordinance = (() => {
			const bits = (_readUint8(save_offsets.TOWN_ORDINANCES) & 0x1e) >> 1;
			const ret = [];
			const ordinance_list = ["Early Bird", "Night Owl", "Bell Boom", "Keep Town Beautiful"];

			for(let i = 1; i < 4; i++) {
				if(bits & (1 << i)) ret.push(ordinance_list[i]);
			}
			return ret.join(" + ");
		})();
		this.town.villagers = (() => {
			const ret = [];
			for(let i = 0; i < 10; i++) {
				const base_offset = save_offsets.VILLAGERS + save_offsets.VILLAGER_SIZE*i;
				const villager = villager_data[_readUint16(base_offset + save_offsets.VILLAGER_ID)];
				if(villager) ret.push(villager[0][0]);
			}
			return ret;
		})();
		this.town.best_turnip_price = 0;
		this.town.turnip_prices = (() => {
			const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
			const ret = {};
			for(let i = 0; i < days.length; i++) {
				ret[days[i]] = {};
				for(let j = 0; j <= 8; j += 8) {
					const price = _readEncryptedValue(save_offsets.TOWN_TURNIP_PRICES + (i*16) + j);
					if(price > this.town.best_turnip_price) this.town.best_turnip_price = price;
					ret[days[i]][(j) ? "pm" : "am"] = price;
				}
			}
			return ret;
		})();
	}
}
