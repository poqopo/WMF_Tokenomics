const We_Made_Future = artifacts.require('We_Made_Future')
const We_Made_Future_USD = artifacts.require('WUSDstablecoin')
const temp_addres = "0x6EaD9ef7c00f513687c93a6AA3e46c498a671540"


module.exports = async function(deployer, network, accounts) {
  // Deploy WUSD
  await deployer.deploy(We_Made_Future_USD, "We_Made_Future_USD", "WUSD", temp_addres)
  const we_made_future_USD = await We_Made_Future_USD.deployed()

  // Deploy WMF
  await deployer.deploy(We_Made_Future, "We_Made_Future", "WMF", temp_addres, temp_addres)
  const we_made_future = await We_Made_Future.deployed()


  // Transfer WMF to accounts[1] (1 million)
  await we_made_future.transfer(accounts[1], '1000000000000000000000000')

  // Transfer WUSD to accoutns[2]
  await we_made_future_USD.transfer(accounts[2], '100000000000000000000')
}
