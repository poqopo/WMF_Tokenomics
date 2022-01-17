const We_Made_Future = artifacts.require('We_Made_Future')
const WUSDStablecoin = artifacts.require('WUSDStablecoin')
const WUSDPool = artifacts.require('WUSDPool')
const WUSDPoolLibrary = artifacts.require('WUSDPoolLibrary')

const Owner_Address = "0xe7f890A0CB4c0Cbd68848F26F0998562502323Dc"
const DAI_Address = "0xaD6D458402F60fD3Bd25163575031ACDce07538D"

module.exports = async function(deployer, network, accounts) {
  // Deploy WUSD
  await deployer.deploy(WUSDStablecoin, "We_Made_Future_USD", "WUSD", Owner_Address)
  const wusdstablecoin = await WUSDStablecoin.deployed()

  // Deploy WMF
  await deployer.deploy(We_Made_Future, "We_Made_Future", "WMF", "0x83F00b902cbf06E316C95F51cbEeD9D2572a349a", Owner_Address)
  const we_made_future = await We_Made_Future.deployed()

  // Deploy WUSDPool
  await deployer.deploy(WUSDPoolLibrary)
  await deployer.link(WUSDPoolLibrary, WUSDPool)
  await deployer.deploy(WUSDPool, wusdstablecoin.address, we_made_future.address, DAI_Address, Owner_Address)
}