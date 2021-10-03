import { syncMempoolToGorilla, syncTxToGorilla } from "../src";
const run = async () => {
  try {
    await syncTxToGorilla(
      "498da2eb99efe156bce22e3b8e21127ce984ab4d82aa3ae2543fd8d5c1b6b1b7"
    );
    await syncMempoolToGorilla();
  } catch (e) {
    if (e.reqData) delete e.reqData;
    console.log(e);
  }
};

run();
