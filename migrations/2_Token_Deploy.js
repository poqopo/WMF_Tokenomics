const We_Made_Future = artifacts.require('We_Made_Future')
const We_Made_Future_USD = artifacts.require('WUSDstablecoin')
const WUSDPool = artifacts.require('WUSDPool')
const WUSDPoolLibrary = artifacts.require('WUSDPoolLibrary')

const Owner_Address = "0xe7f890A0CB4c0Cbd68848F26F0998562502323Dc"
const WMF_Address = "0x040d87e9A4f44dF98b67C60B47515019975E7ad7"
const WUSD_Address = "0xB7FB1bb06a10f7Ec53CaC0Bf29d7d7c058A47dE8"
const DAI_Address = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"


module.exports = async function(deployer, network, accounts) {
  // Deploy WUSD
  await deployer.deploy(We_Made_Future_USD, "We_Made_Future_USD", "WUSD", Owner_Address)
  const we_made_future_USD = await We_Made_Future_USD.deployed()

  // Deploy WMF
  await deployer.deploy(We_Made_Future, "We_Made_Future", "WMF", "0x83F00b902cbf06E316C95F51cbEeD9D2572a349a", Owner_Address)
  const we_made_future = await We_Made_Future.deployed()

  // Deploy WUSDPool
  await deployer.deploy(WUSDPoolLibrary)
  await deployer.link(WUSDPoolLibrary, WUSDPool)
  await deployer.deploy(WUSDPool, WUSD_Address, WMF_Address, DAI_Address, Owner_Address)
  const wusdpool = await WUSDPool.deployed()

}