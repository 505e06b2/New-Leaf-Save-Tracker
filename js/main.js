import SaveManager from "./savemanager.js"

window.save_manager = null;
let body_template;

window.onload = async () => { //remove when possible
	body_template = await (await fetch("./js/template.html")).text();
	//document.body.innerHTML = "";
	//window.save_manager = new SaveManager( await(await fetch("garden_plus.dat")).arrayBuffer() ); //DEBUGGING
	//window.save_manager = new SaveManager( await(await fetch("garden_plus_other.dat")).arrayBuffer() ); //DEBUGGING
	//propagateWebpage();
}

window.fileLoad = async (e) => {
	const reader = new FileReader();
	reader.onload = () => {
		window.save_manager = new SaveManager(reader.result);
		propagateWebpage();
	};

	reader.readAsArrayBuffer(e.target.files[0]);
}

function propagateWebpage() {
	console.log(window.save_manager);

	const th = (d) => {
		if (d > 3 && d < 21) return 'th';
		switch (d % 10) {
			case 1:  return "st";
			case 2:  return "nd";
			case 3:  return "rd";
			default: return "th";
		}
	};

	const playtime = `${(window.save_manager.players[0].playtime / 3600.0).toFixed(1)}hrs`;
	let template = body_template;
	if(window.save_manager.players[0].tpc.text) template = template.replace('<div id="tpc_text"></div>', `<div class="tpc_comment">${window.save_manager.players[0].tpc.text}</div>`);

	document.body.innerHTML = template
		.replace("${player1_name}", window.save_manager.players[0].name)
		.replace("${player1_gender}", window.save_manager.players[0].gender)
		.replace("${player1_playtime}", playtime)
		.replace("${player1_tpc_pic}", window.save_manager.players[0].tpc.pic)
		.replace("${player1_dream_address}", window.save_manager.players[0].tpc.dream_address)
		.replace("${player1_birthday}", (() => {
			const t = window.save_manager.players[0].birthday;
				return `${t.toLocaleString('default', { month: 'long' })} ${t.getDate() + th(t.getDate())}`;
			})()
		)
		.replace("${player1_registration_date}", (() => {
			const t = window.save_manager.players[0].registration;
				return `${t.toLocaleString('default', { month: 'long' })} ${t.getDate() + th(t.getDate())}, ${t.getFullYear()}`;
			})()
		)

		.replace("${town_name}", window.save_manager.town.name)
		.replace("${town_ordinance}", window.save_manager.town.ordinance)
		.replace("${town_fruit}", window.save_manager.town.native_fruit)
		.replace("${villagers_list}", (() => {
			let html_out = '<div class="villagers">';
			for(let v in window.save_manager.town.villagers) {
				html_out += `<div>${window.save_manager.town.villagers[v]}</div>`;
			}
			return html_out + "</div>"
		})())
		.replace("${turnip_prices_table}", (() => {
			let html_out = `<div class="turnip_prices">
					<div style="padding-bottom: 5px"> <div>&nbsp;</div><div>AM</div><div>PM</div> </div>`;
			for(const key in window.save_manager.town.turnip_prices) {
				const day = window.save_manager.town.turnip_prices[key];
				const am = (day.am === window.save_manager.town.best_turnip_price) ? `<span class="highest">${day.am}</span>` : day.am;
				const pm = (day.pm === window.save_manager.town.best_turnip_price) ? `<span class="highest">${day.pm}</span>` : day.pm;
				html_out += `<div> <div>${key}</div><div>${am}</div><div>${pm}</div> </div>`;
			}
			return html_out + "</div>";
		})())
}
