import { API_NET, Sensible, WhatsOnChain } from "bsv-util";

async function run() {
  let wocPool: string[];
  let msg = "";
  let wocApi = new WhatsOnChain(API_NET.MAIN);
  let sensibleApi = new Sensible(API_NET.MAIN);

  try {
    let t1 = Date.now();
    let _res = await wocApi.getMempool();
    console.log("whatsonchain request time: ", (Date.now() - t1) / 1000 + "s");
    msg += `\nWhatsonchain: ${_res.length}`;
    wocPool = _res;
  } catch (e) {
    console.error(e);
    msg += "\nWhatsonchain: request failed!";
  }

  try {
    let t1 = Date.now();
    let _res = await sensibleApi.getMempool();
    msg += `\nSensible:     ${_res.length}`;
    console.log("sensibleApi request time:", (Date.now() - t1) / 1000 + "s");
    let diff = _res.filter((v: string) => wocPool.includes(v) == false);
    msg += `\nDiff:         ${diff.length}`;
  } catch (e) {
    console.error(e);
    msg += "\nSensible:     request failed!";
  }
  console.log(msg);
}

run();
