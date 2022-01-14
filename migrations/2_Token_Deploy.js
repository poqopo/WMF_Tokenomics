const We_Made_Future = artifacts.require('We_Made_Future')
const We_Made_Future_USD = artifacts.require('WUSDstablecoin')
const Owner_Address = "0xe7f890A0CB4c0Cbd68848F26F0998562502323Dc"


module.exports = async function(deployer, network, accounts) {
  // Deploy WUSD
  await deployer.deploy(We_Made_Future_USD, "We_Made_Future_USD", "WUSD", Owner_Address)
  const we_made_future_USD = await We_Made_Future_USD.deployed()

  // Deploy WMF
  await deployer.deploy(We_Made_Future, "We_Made_Future", "WMF", "0x83F00b902cbf06E316C95F51cbEeD9D2572a349a", Owner_Address)
  const we_made_future = await We_Made_Future.deployed()

}
