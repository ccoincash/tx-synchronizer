import {
  API_NET,
  API_TARGET,
  BlockChainApi,
  MAPI_NET,
  MAPI_TARGET,
  MerchantApi,
} from "bsv-util";
const sensibleApi = new BlockChainApi(API_TARGET.SENSIBLE, API_NET.MAIN);

export class MempoolSyncer {
  nextTxId: string = "";
  failedTimes: number = 0;
  jobRunning: boolean = false;
  skipCount: number = 0; //跳过的交易数
  pushCount: number = 0; //成功的交易数
  leftCount: number = 0; //剩余交易数
  mapi: MerchantApi;
  mapi2: MerchantApi;
  name: string = "";
  syncMessageEnabled: boolean = false;
  constructor(mapiTarget: MAPI_TARGET) {
    if (mapiTarget == MAPI_TARGET.TAAL) {
      this.name = "taal";
    } else if (mapiTarget == MAPI_TARGET.GORILLA) {
      this.name = "gorilla";
    } else {
      this.name = "other";
    }
    this.mapi = new MerchantApi(mapiTarget, MAPI_NET.MAIN, "");
    this.mapi2 = new MerchantApi(MAPI_TARGET.GORILLA, MAPI_NET.MAIN, "");
  }

  getSyncProgressInfo() {
    return `\n${this.name}
  正在同步:${this.nextTxId}
  跳过存在数: ${this.skipCount}
  推送成功数: ${this.pushCount}
  剩余同步数: ${this.leftCount}
          `;
  }

  startJob(nextTxId?: string) {
    if (this.jobRunning) {
      return this.getSyncProgressInfo();
    } else {
      this.nextTxId = nextTxId || "";
      this.jobRunning = true;
      this.failedTimes = 0;
      this.skipCount = 0;
      this.pushCount = 0;
      this.leftCount = 0;
      this.runJob();
      return "";
    }
  }

  restartJob(nextTxId?: string) {
    if (this.jobRunning) {
      if (nextTxId) this.nextTxId = nextTxId;
      this.jobRunning = true;
      this.failedTimes = 0;
      this.skipCount = 0;
      this.pushCount = 0;
      this.leftCount = 0;
      this.runJob();
    } else {
      this.nextTxId = nextTxId || "";
      this.jobRunning = true;
      this.failedTimes = 0;
      this.skipCount = 0;
      this.pushCount = 0;
      this.leftCount = 0;
      this.runJob();
    }
  }

  stopJob() {
    this.jobRunning = false;
  }

  printMsg(msg: string) {
    if (this.syncMessageEnabled) {
      console.log(msg);
    }
  }

  async runJob() {
    console.log("runjob");
    let startIndex = 0;

    let list = [];

    try {
      let t1 = Date.now();
      console.log("getMempool start");
      let sensiblePool = await sensibleApi.getMempool();
      console.log("getMempool end", (Date.now() - t1) / 1000 + "s");
      for (let i = 0; i < sensiblePool.length; i++) {
        if (sensiblePool[i] == this.nextTxId) {
          //找到最后成功
          startIndex = i;
        }
      }
      list = sensiblePool;
    } catch (e) {
      console.log("getMempool failed");
      if (this.failedTimes > 3000000) {
        let msg = `${this.name}
  同步中断: ${this.nextTxId}
  跳过存在数: ${this.skipCount}
  成功推送数: ${this.pushCount}
  中断次数过多，终止同步`;
        this.skipCount = 0;
        this.pushCount = 0;
        this.jobRunning = false;
        this.printMsg(msg);
      } else {
        let msg = `${this.name}
  同步中断: ${this.nextTxId}
  跳过存在数: ${this.skipCount}
  成功推送数: ${this.pushCount}
  getMempool failed
  将在5s后重试`;
        this.printMsg(msg);
        this.skipCount = 0;
        this.pushCount = 0;
        this.failedTimes++;
        setTimeout(() => {
          console.log("retry");
          this.runJob();
        }, 30000);
      }

      return;
    }

    let errorMessage = "";
    let success = 0;
    let failed = 0;

    for (let i = startIndex; i < list.length; i++) {
      let txid = list[i];
      this.nextTxId = txid;
      if (this.jobRunning != true) {
        this.printMsg(`${this.name}
  同步中断: ${this.nextTxId}
  跳过存在数: ${this.skipCount}
  成功推送数: ${this.pushCount}
  剩余同步数: ${list.length - i}
          `);
        return;
      }
      try {
        /*let status = await this.mapi.getTransactionStatus(txid);
        if (status.returnResult == "success") {
          this.failedTimes = 0;
          this.skipCount++;
          this.leftCount = list.length - i;
          success++;
          console.log(
            `success ${i} skip:${this.skipCount} push:${this.pushCount} txid: ${txid}`
          );
        } else {*/
          let txHex = await sensibleApi.getRawTxData(txid);
          //let result2 = this.mapi2.broadcast(txHex);
          let result = await this.mapi.broadcast(txHex);
          if (result.returnResult == "success" || result.resultDescription == 'Transaction already in the mempool') {
            this.failedTimes = 0;
            this.pushCount++;
            this.leftCount = list.length - i;
            success++;
            console.log(
              `success ${i} skip:${this.skipCount} push:${this.pushCount} txid: ${txid}`
            );
          } else {
            console.log(
              `failed ${i} skip:${this.skipCount} push:${this.pushCount} txid: ${txid}`
            );
            console.log(result);
            errorMessage = `推送失败! ${result.resultDescription}`;
          }
        //}
      } catch (e) {
        if ((e as any).reqData) delete (e as any).reqData;
        console.log("failed", i, failed, txid, e);
        errorMessage = `推送失败!`;
        failed++;
      }
      if (errorMessage) {
        this.failedTimes++;
        break;
      }
    }
    let msg = "";
    if (errorMessage) {
      if (this.failedTimes > 30000000000) {
        msg = `\n${this.name}
  同步中断: ${this.nextTxId}
  跳过存在数: ${this.skipCount}
  成功推送数: ${this.pushCount}
  ${errorMessage}
  中断次数过多，终止同步`;
        this.skipCount = 0;
        this.pushCount = 0;
        this.jobRunning = false;
      } else {
        msg = `\n${this.name}
  同步中断: ${this.nextTxId}
  跳过存在数: ${this.skipCount}
  成功推送数: ${this.pushCount}
  ${errorMessage}
  将在5s后重试`;
        this.skipCount = 0;
        this.pushCount = 0;
        setTimeout(() => {
          console.log("retry");
          this.runJob();
        }, 30000);
      }
    } else {
      if (success > 0) {
        //         msg = `\n${this.name}
        // 同步完成:
        // 跳过存在数: ${this.skipCount}
        // 成功推送数: ${this.pushCount}`;
        this.skipCount = 0;
        this.pushCount = 0;
      } else {
        //         msg = `\n${this.name}
        // 同步完成。`;
      }
      this.jobRunning = false;
    }
    if (msg) {
      this.printMsg(msg);
    }
  }
}
