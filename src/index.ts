import {
  API_NET,
  API_TARGET,
  BlockChainApi,
  MAPI_NET,
  MAPI_TARGET,
  MerchantApi,
} from "bsv-util";
const sensibleApi = new BlockChainApi(API_TARGET.SENSIBLE, API_NET.MAIN);
const wocApi = new BlockChainApi(API_TARGET.WHATSONCHAIN, API_NET.MAIN);
const taalMapi = new MerchantApi(MAPI_TARGET.TAAL, MAPI_NET.MAIN, "");
const gorillaMapi = new MerchantApi(MAPI_TARGET.GORILLA, MAPI_NET.MAIN, "");

export async function syncTxToWoc(txid: string) {
  let txHex = await sensibleApi.getRawTxData(txid);
  return await wocApi.broadcast(txHex);
}

export async function syncFromMempoolToWoc() {
  let wocPool = await wocApi.getMempool();
  let sensiblePool = await sensibleApi.getMempool();
  let list = sensiblePool.filter((v) => wocPool.includes(v) == false);
  console.log("wocPool:", wocPool.length);
  console.log("sensiblePool:", sensiblePool.length);
  console.log("diff:", list.length);
  let success = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i++) {
    let txid = list[i];
    try {
      let _res = await syncTxToWoc(txid);
      console.log("success", i, success, txid);
      success++;
    } catch (e) {
      if (e.reqData) delete e.reqData;
      console.log("failed", i, failed, txid, e);
      failed++;
    }
  }
  console.log(success, failed);
}

async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(0);
    }, time * 1000);
  });
}

async function syncFromSensibleToMapi(mapi: MerchantApi) {
  let sensiblePool = await sensibleApi.getMempool();
  let list = sensiblePool;
  console.log("sensiblePool:", sensiblePool.length);
  let skipCount = 0;
  let pushCount = 0;
  let success = 0;
  let failed = 0;
  let start = false;
  for (let i = 0; i < list.length; i++) {
    let txid = list[i];
    try {
      let status = await mapi.getTransactionStatus(txid);
      if (status.returnResult == "success") {
        skipCount++;
        console.log(
          "success already in pool, skip.",
          i,
          skipCount,
          pushCount,
          txid
        );
      } else {
        let txHex = await sensibleApi.getRawTxData(txid);
        let _res = await mapi.broadcast(txHex);
        pushCount++;
        console.log("success", i, skipCount, pushCount, txid);
      }
      success++;
    } catch (e) {
      if (e.reqData) delete e.reqData;
      console.log("failed", i, failed, txid, e);
      failed++;
    }
  }
  console.log(success, failed);
}

async function syncOneTxFromSensibleToMapi(mapi: MerchantApi, txid: string) {
  let status = await mapi.getTransactionStatus(txid);
  if (status.returnResult == "success") {
    console.log("success already in pool, skip.");
  } else {
    let txHex = await sensibleApi.getRawTxData(txid);
    let _res = await mapi.broadcast(txHex);
    console.log(_res);
  }
}

export async function syncMempoolToGorilla() {
  return await syncFromSensibleToMapi(gorillaMapi);
}

export async function syncTxToGorilla(txid: string) {
  return await syncOneTxFromSensibleToMapi(gorillaMapi, txid);
}

export async function syncMempoolToTaal() {
  return await syncFromSensibleToMapi(taalMapi);
}

export async function syncTxToTaal(txid: string) {
  return await syncOneTxFromSensibleToMapi(taalMapi, txid);
}
